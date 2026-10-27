// PreToolUse guard: blocks any AI tool call that targets a protected name.
//
// Claude Code runs this before every tool call (read, write, edit, search,
// shell, publish...). If a path, command or search in the call mentions a
// protected name, in any letter case, the call is refused (exit code 2) and
// the AI is told why. If this script cannot run, settings.json is set to
// block the call anyway (`onFailure: "block"`).
//
// To protect another name, add it to PROTECTED.

const PROTECTED = [/wallet/i];

// Free-text fields. Words in these are not file targets, so they are not
// checked: the AI may still write code elsewhere that *mentions* a protected
// name (an import, a link). The target file path is always checked.
const SKIP_KEYS = new Set([
  'content', 'new_string', 'old_string', 'new_source',
  'description', 'prompt', 'reason', 'message',
  'question', 'header', 'label', 'preview',
  'title', 'summary', 'body', 'text',
]);

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function collectStrings(value, key, out) {
  if (typeof value === 'string') {
    if (!SKIP_KEYS.has(key)) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, key, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectStrings(v, k, out);
  }
}

// Remove the project folder's own path first, so a checkout that happens to
// live under a folder with a protected name doesn't block everything.
function withoutProjectDir(text, projectDir) {
  const normalized = text.replace(/\\/g, '/');
  if (!projectDir) return normalized;
  const dir = projectDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return normalized.replace(new RegExp(escaped, 'gi'), '');
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let call;
  try {
    call = JSON.parse(raw);
  } catch {
    block('Blocked: the protected-path guard could not read this tool call, so it was refused to be safe.');
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || call.cwd || '';
  const strings = [];
  collectStrings(call.tool_input ?? {}, '', strings);

  const hit = strings.some((s) => {
    const target = withoutProjectDir(s, projectDir);
    return PROTECTED.some((re) => re.test(target));
  });

  if (hit) {
    block(
      `Blocked by project policy: AI tools may not read, create, change, delete or search ` +
      `files or folders named "wallet" (any letter case). Do not look for another way in. ` +
      `Tell the user this part must be handled by a person.`,
    );
  }

  process.exit(0);
});
