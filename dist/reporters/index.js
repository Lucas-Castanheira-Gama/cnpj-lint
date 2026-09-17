import { reportGithub } from './github.js';
import { reportJson } from './json.js';
import { reportMarkdown } from './markdown.js';
import { reportPretty } from './pretty.js';
import { reportSarif } from './sarif.js';
export const FORMATS = ['pretty', 'json', 'sarif', 'markdown', 'github'];
export function report(result, format, options = {}) {
    switch (format) {
        case 'json':
            return reportJson(result);
        case 'sarif':
            return reportSarif(result);
        case 'markdown':
            return reportMarkdown(result);
        case 'github':
            return reportGithub(result);
        default:
            return reportPretty(result, {
                color: options.color ?? false,
                verbose: options.verbose ?? false,
            });
    }
}
export { countFindings } from './summary.js';
export { reportGithub, reportJson, reportMarkdown, reportPretty, reportSarif };
