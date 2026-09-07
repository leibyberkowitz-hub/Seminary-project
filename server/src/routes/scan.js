// Application form scanning: upload a photo or PDF of a paper application and
// Claude's vision reads it — handwriting and Yiddish/Hebrew included — into the
// structured fields of the applications table. The result is returned for
// human review; nothing is saved until the user confirms the pre-filled form.
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

export const scanRouter = Router();

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 18 * 1024 * 1024; // decoded upload cap; API request cap is 32MB

const ApplicationScan = z.object({
  first_name: z.string().describe('First name in English/Latin letters; transliterate if only Hebrew script appears'),
  surname: z.string().describe('Family name in English/Latin letters'),
  yiddish_name: z.string().describe('Name exactly as written in Hebrew/Yiddish script, empty if none'),
  date_of_birth: z.string().nullable().describe('ISO YYYY-MM-DD, null if absent or unreadable'),
  contact_phone: z.string().describe('Best contact phone number on the form, as written'),
  previous_school: z.string().describe('Previous/current school name, empty if none'),
  address: z.string().describe('Home address, empty if none'),
  parent_names: z.string().describe("Parents' names as written, empty if none"),
  extra_details: z.string().describe('Any other information on the form worth keeping (siblings, references, health notes, requested class/year), as short plain text'),
  unreadable_fields: z.array(z.string()).describe('Names of fields that were present on the form but could not be read confidently'),
});

// POST /api/import/application-scan  { media_type, data: <base64> }
scanRouter.post('/application-scan', async (req, res, next) => {
  try {
    const { media_type: mediaType, data } = req.body || {};
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'data (base64 file content) is required' });
    }
    const isPdf = mediaType === 'application/pdf';
    if (!isPdf && !IMAGE_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: `Unsupported file type '${mediaType}'. Use a JPEG/PNG/WebP photo or a PDF.` });
    }
    if (data.length * 0.75 > MAX_BYTES) {
      return res.status(400).json({ error: 'File is too large (max 18MB). Try a smaller photo.' });
    }

    const clean = data.replace(/\s+/g, '');
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: clean } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: clean } };

    const client = new Anthropic(); // ANTHROPIC_API_KEY (or other SDK-resolved credentials)
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system:
        'You read scanned school application forms for a Jewish seminary/school. ' +
        'Forms may be handwritten and mix English with Hebrew or Yiddish. ' +
        'Extract only what is actually on the form — never invent values; use empty strings or null for anything absent. ' +
        'Dates on these forms are usually day-first (UK style) unless clearly labelled otherwise. ' +
        'Keep Hebrew/Yiddish text in Hebrew script exactly as written.',
      messages: [{
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: 'Read this application form and extract the fields.' },
        ],
      }],
      output_config: { format: zodOutputFormat(ApplicationScan) },
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'The model declined to process this file. Please check the scan and try again.' });
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return res.status(422).json({ error: 'Could not extract structured fields from this scan. Try a clearer photo.' });
    }

    const notes = [
      parsed.address && `Address: ${parsed.address}`,
      parsed.parent_names && `Parents: ${parsed.parent_names}`,
      parsed.extra_details,
      parsed.unreadable_fields.length && `⚠ Could not read: ${parsed.unreadable_fields.join(', ')}`,
    ].filter(Boolean).join('\n');

    res.json({
      application: {
        first_name: parsed.first_name,
        surname: parsed.surname,
        yiddish_name: parsed.yiddish_name,
        date_of_birth: parsed.date_of_birth,
        contact_phone: parsed.contact_phone,
        previous_school: parsed.previous_school,
        status: 'Pending',
        notes,
      },
      unreadable_fields: parsed.unreadable_fields,
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e.status === 401 ||
        /could not resolve authentication/i.test(e.message || '')) {
      return res.status(503).json({
        error: 'Scanning is not configured: set the ANTHROPIC_API_KEY environment variable on the server and restart it.',
      });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Scanning service is busy — try again in a minute.' });
    }
    if (e instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Scanning failed: ${e.message}` });
    }
    next(e);
  }
});
