// MCP server for reMarkable 2 actions that need SSH, in JavaScript for
// Automation (JXA). Runs with /usr/bin/osascript, so it needs nothing beyond
// macOS, and runs on the Mac itself (outside Cowork's VM).
//
// Connects as root@10.11.99.1 over the USB cable or, failing that, through the
// SSH host in RM2_SSH_HOST (or a host passed to a tool) over Wi-Fi, so every
// tool behaves the same over USB and Wi-Fi. Every connection uses BatchMode,
// so it never prompts.
//
// Speaks MCP over stdio: one JSON-RPC message per line.

ObjC.import('Foundation');

const app = Application.currentApplication();
app.includeStandardAdditions = true;

const env = $.NSProcessInfo.processInfo.environment;
const configuredHost = plainHost(ObjC.unwrap(env.objectForKey('RM2_SSH_HOST')) || '');
const XOCHITL = '/home/root/.local/share/remarkable/xochitl';
const PLUGIN_ID = 'indiigo-rm2-ssh@indiigo-remarkable';

// ---------------------------------------------------------------- utilities

function plainHost(host) {
  // An unset plugin option arrives as the literal placeholder; ignore it and
  // anything else that is not a plain host name.
  return /^[0-9A-Za-z._@][0-9A-Za-z._@-]*$/.test(host) ? host : '';
}

function quote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function sh(command) {
  return app.doShellScript(command, { alteringLineEndings: false });
}

function tryShell(command) {
  try {
    return { ok: true, out: sh(command) };
  } catch (e) {
    return { ok: false, out: '' };
  }
}

const SSH = 'ssh -o BatchMode=yes -o ConnectTimeout=5 ';

// Pick the first target that answers, cable first.
function target(args) {
  const host = plainHost(String((args && args.ssh_host) || '')) || configuredHost;
  if (tryShell(SSH + 'root@10.11.99.1 true').ok) return { ssh: 'root@10.11.99.1', via: 'usb' };
  if (host && tryShell(SSH + quote(host) + ' true').ok) return { ssh: host, via: 'wifi' };
  throw new Error(host ? 'not connected' : 'not connected, and no SSH host is set for Wi-Fi');
}

function remote(t, script) {
  return sh(SSH + quote(t.ssh) + ' ' + quote(script));
}

// Every document and folder: ID, type, parent ("" top level, "trash") and name.
function entries(t) {
  const out = remote(
    t,
    'cd ' + XOCHITL + ' && for f in *.metadata; do awk -F\'"\' -v id="${f%.metadata}" \'' +
      '/"parent"/ { p = $4 } /"type"/ { y = $4 } /"visibleName"/ { n = $4 } ' +
      'END { print id "\\t" y "\\t" p "\\t" n }\' "$f"; done',
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, type, parent, name] = line.split('\t');
      return { id, type, parent, name };
    });
}

function folderPath(all, parent) {
  if (parent === '') return '(top level)';
  if (parent === 'trash') return '(trash)';
  const names = [];
  for (let id = parent, guard = 0; id && id !== 'trash' && guard < 50; guard++) {
    const f = all.find((e) => e.id === id);
    if (!f) break;
    names.unshift(f.name);
    id = f.parent;
  }
  return names.join(' / ');
}

function text(s) {
  return [{ type: 'text', text: s }];
}

// ---------------------------------------------------------------- tools

const HOST_PROPERTY = {
  ssh_host: { type: 'string', description: 'SSH host for Wi-Fi, only when the plugin setting is not set yet' },
};

const TOOLS = [
  {
    name: 'check',
    description:
      'Check whether the reMarkable 2 can be reached over SSH, over its USB cable or Wi-Fi. Reports whether an SSH host for Wi-Fi is set.',
    inputSchema: { type: 'object', properties: HOST_PROPERTY },
    run(args) {
      const host = plainHost(String(args.ssh_host || '')) || configuredHost;
      const setting = configuredHost ? 'Wi-Fi SSH host setting: ' + configuredHost : 'Wi-Fi SSH host setting: not set';
      try {
        return text('connected: ' + target(args).via + '\n' + setting);
      } catch (e) {
        return text('not connected' + (host ? ' (tried USB and ' + host + ')' : ' (tried USB)') + '\n' + setting);
      }
    },
  },
  {
    name: 'find_documents',
    description:
      'Find documents on the reMarkable 2 by name (case-insensitive, partial match), with the folder each is in. Folders and the trash are included in the folder names.',
    inputSchema: {
      type: 'object',
      properties: Object.assign({ name: { type: 'string', description: 'Document name or part of it' } }, HOST_PROPERTY),
      required: ['name'],
    },
    run(args) {
      const t = target(args);
      const all = entries(t);
      const wanted = String(args.name).trim().toLowerCase();
      const found = all
        .filter((e) => e.type === 'DocumentType' && e.name.toLowerCase().indexOf(wanted) >= 0)
        .map((e) => ({ id: e.id, name: e.name, folder: folderPath(all, e.parent) }));
      return text(JSON.stringify(found, null, 1));
    },
  },
  {
    name: 'delete',
    description:
      'Permanently delete a document from the reMarkable 2, including from reMarkable cloud sync. Takes the id from find_documents. The tablet returns to its home screen for a few seconds while it reloads. Only call this after the user has confirmed.',
    inputSchema: {
      type: 'object',
      properties: Object.assign({ id: { type: 'string', description: 'Document id from find_documents' } }, HOST_PROPERTY),
      required: ['id'],
    },
    run(args) {
      const id = String(args.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('invalid document id');
      const t = target(args);
      // Cloud sync restores documents whose files vanish without a tombstone,
      // and the tablet's interface only notices file changes when it restarts.
      const out = remote(
        t,
        'cd ' + XOCHITL + ' || exit 1; id=' + id + '; ' +
          '[ -f "$id.metadata" ] || { echo "ERROR: no such document"; exit 0; }; ' +
          'grep -q \'"type": "DocumentType"\' "$id.metadata" || { echo "ERROR: only documents can be deleted"; exit 0; }; ' +
          'systemctl stop xochitl; rm -rf "$id" "$id".*; ' +
          'date +"%a %b %e %H:%M:%S %Y" > "$id.tombstone"; systemctl start xochitl; echo deleted',
      ).trim();
      if (out !== 'deleted') throw new Error(out.replace(/^ERROR: /, ''));
      return text('deleted');
    },
  },
  {
    name: 'save_ssh_host',
    description:
      "Save the SSH host for Wi-Fi as this plugin's ssh_host setting, so the user is not asked again. Takes effect after Claude restarts. Only call this after the user has agreed.",
    inputSchema: {
      type: 'object',
      properties: { ssh_host: { type: 'string' } },
      required: ['ssh_host'],
    },
    run(args) {
      const host = plainHost(String(args.ssh_host || ''));
      if (!host) throw new Error('invalid host name');
      const r = tryShell(
        'printf %s ' + quote(JSON.stringify({ ssh_host: host })) +
          ' | PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" claude plugin configure ' + PLUGIN_ID + ' --values-stdin',
      );
      if (!r.ok) throw new Error('could not save the setting; set it with /plugin configure indiigo-rm2-ssh');
      return text('saved; it takes effect after Claude restarts');
    },
  },
];

// ---------------------------------------------------------------- MCP stdio

const stdin = $.NSFileHandle.fileHandleWithStandardInput;
const stdout = $.NSFileHandle.fileHandleWithStandardOutput;
const stderr = $.NSFileHandle.fileHandleWithStandardError;

function write(handle, s) {
  handle.writeData($(s).dataUsingEncoding($.NSUTF8StringEncoding));
}

function send(message) {
  write(stdout, JSON.stringify(message) + '\n');
}

function handle(message) {
  const { id, method, params } = message;
  if (id === undefined) return; // notification
  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: (params && params.protocolVersion) || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'indiigo reMarkable SSH', version: '0.1.0' },
      },
    });
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else if (method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) },
    });
  } else if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params.name);
    try {
      if (!tool) throw new Error('unknown tool ' + params.name);
      send({ jsonrpc: '2.0', id, result: { content: tool.run(params.arguments || {}) } });
    } catch (e) {
      send({ jsonrpc: '2.0', id, result: { content: text('Error: ' + e.message), isError: true } });
    }
  } else {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + method } });
  }
}

function run() {
  let buffer = '';
  for (;;) {
    const data = stdin.availableData;
    if (Number(data.length) === 0) break; // stdin closed (JXA returns the length as a string)
    buffer += ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding));
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        handle(JSON.parse(line));
      } catch (e) {
        write(stderr, 'bad message: ' + e + '\n');
      }
    }
  }
}
