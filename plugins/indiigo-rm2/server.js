// MCP server for a reMarkable 2, in JavaScript for Automation (JXA).
// Runs with /usr/bin/osascript, so it needs nothing beyond macOS, and runs on
// the Mac itself (outside Cowork's VM), where it can reach the tablet.
//
// The tablet's web interface is at http://10.11.99.1 over the USB cable. When
// the cable is not connected and RM2_SSH_HOST is set, the same requests run on
// the tablet over SSH (wget for reads, an SSH tunnel for uploads), so every
// tool behaves the same over USB and Wi-Fi.
//
// Speaks MCP over stdio: one JSON-RPC message per line.

ObjC.import('Foundation');
ObjC.import('AppKit');
ObjC.import('PDFKit');

const app = Application.currentApplication();
app.includeStandardAdditions = true;

const BASE = 'http://10.11.99.1';
const env = $.NSProcessInfo.processInfo.environment;
const sshHost = plainHost(ObjC.unwrap(env.objectForKey('RM2_SSH_HOST')) || '');
const cacheDir = (ObjC.unwrap(env.objectForKey('TMPDIR')) || '/tmp/').replace(/\/?$/, '/') + 'indiigo-rm2';
const MAX_PAGES = 5;

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

function safePath(path) {
  if (!/^(documents\/[0-9a-f-]*|download\/[0-9a-f-]+\/pdf)$/.test(path)) throw new Error('unsupported path');
  return path;
}

const SSH = 'ssh -o BatchMode=yes -o ConnectTimeout=5 ';

// ---------------------------------------------------------------- transport

let route = null; // 'usb' or 'wifi', remembered until a request fails

function connect() {
  if (tryShell('curl -sf --connect-timeout 2 --max-time 5 -o /dev/null ' + BASE + '/documents/').ok) return (route = 'usb');
  if (sshHost && tryShell(SSH + quote(sshHost) + ' ' + quote('wget -q -T 5 -O /dev/null ' + BASE + '/documents/')).ok)
    return (route = 'wifi');
  route = null;
  throw new Error('not connected');
}

function viaRoute(usbCommand, wifiCommand) {
  if (!route) connect();
  let r = tryShell(route === 'usb' ? usbCommand : wifiCommand);
  if (r.ok) return r.out;
  connect(); // the route may have changed, e.g. cable unplugged
  r = tryShell(route === 'usb' ? usbCommand : wifiCommand);
  if (r.ok) return r.out;
  throw new Error('not connected');
}

function get(path, secs) {
  path = safePath(path);
  return viaRoute(
    'curl -sf --connect-timeout 2 --max-time ' + secs + ' ' + BASE + '/' + path,
    SSH + quote(sshHost) + ' ' + quote('wget -q -T ' + secs + ' -O - ' + BASE + '/' + path),
  );
}

function save(path, file, secs) {
  path = safePath(path);
  viaRoute(
    'curl -sf --connect-timeout 2 --max-time ' + secs + ' -o ' + quote(file) + ' ' + BASE + '/' + path,
    SSH + quote(sshHost) + ' ' + quote('wget -q -T ' + secs + ' -O - ' + BASE + '/' + path) + ' > ' + quote(file),
  );
}

function uploadFile(folderId, file) {
  const type = /\.epub$/i.test(file) ? 'application/epub+zip' : 'application/pdf';
  const form = quote('file=@"' + file + '";type=' + type);
  const listPath = safePath('documents/' + folderId);
  // The tablet uploads into the folder most recently listed, so list it first.
  const usb = 'curl -sf --connect-timeout 2 --max-time 10 -o /dev/null ' + BASE + '/' + listPath +
    ' && curl -sf --max-time 120 -o /dev/null -F ' + form + ' ' + BASE + '/upload';
  const port = 20000 + Math.floor(Math.random() * 10000);
  const local = 'http://127.0.0.1:' + port;
  const wifi = SSH + '-f -o ExitOnForwardFailure=yes -L ' + port + ':10.11.99.1:80 ' + quote(sshHost) + ' sleep 10' +
    ' && curl -sf --max-time 10 -o /dev/null ' + local + '/' + listPath +
    ' && curl -sf --max-time 120 -o /dev/null -F ' + form + ' ' + local + '/upload';
  // Never retry an upload: a transfer that failed late may still have added
  // the document, and a retry would add a second copy.
  connect();
  if (!tryShell(route === 'usb' ? usb : wifi).ok) {
    route = null;
    throw new Error('upload failed');
  }
}

// ---------------------------------------------------------------- documents

function listFolder(id) {
  return JSON.parse(get('documents/' + (id || ''), 10));
}

function kind(item) {
  if (item.Type === 'CollectionType') return 'folder';
  return { notebook: 'notebook', pdf: 'PDF', epub: 'ebook' }[item.fileType] || 'document';
}

function summary(item, path) {
  return {
    name: item.VisibleName,
    kind: kind(item),
    folder: path || '(top level)',
    last_changed: item.ModifiedClient,
    page_last_open: item.CurrentPage === undefined ? undefined : item.CurrentPage + 1,
  };
}

// Every folder and document, with the folder path each is in.
function walk() {
  const all = [];
  const visit = (id, path) => {
    for (const item of listFolder(id)) {
      all.push({ item, path });
      if (item.Type === 'CollectionType') visit(item.ID, path ? path + ' / ' + item.VisibleName : item.VisibleName);
    }
  };
  visit('', '');
  return all;
}

function pick(entries, name, what) {
  const wanted = name.trim().toLowerCase();
  const exact = entries.filter((e) => e.item.VisibleName.toLowerCase() === wanted);
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : entries.filter((e) => e.item.VisibleName.toLowerCase().indexOf(wanted) >= 0);
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw new Error('no ' + what + ' matches "' + name + '"');
  throw new Error(
    'several ' + what + 's match "' + name + '": ' + partial.map((e) => e.item.VisibleName + ' (' + (e.path || 'top level') + ')').join('; '),
  );
}

function findFolder(name) {
  return pick(walk().filter((e) => e.item.Type === 'CollectionType'), name, 'folder');
}

function findDocument(name, folder) {
  let docs = walk().filter((e) => e.item.Type === 'DocumentType');
  if (folder) {
    const f = findFolder(folder);
    docs = docs.filter((e) => e.item.Parent === f.item.ID);
  }
  return pick(docs, name, 'document');
}

// ---------------------------------------------------------------- PDF pages

// Keep one PDF per document, named after its modification time, so a copy is
// reused only while the document is unchanged.
function fetchPdf(item) {
  const stamp = String(item.ModifiedClient).replace(/[^0-9A-Za-z]/g, '-');
  const file = cacheDir + '/' + item.ID + '-' + stamp + '.pdf';
  if (tryShell('test -s ' + quote(file)).ok) return file;
  sh('mkdir -p ' + quote(cacheDir) + ' && rm -f ' + quote(cacheDir + '/' + item.ID) + '-*.pdf');
  const part = cacheDir + '/' + item.ID + '.part';
  try {
    save('download/' + item.ID + '/pdf', part, 300);
    if (sh('head -c 4 ' + quote(part)) !== '%PDF') throw new Error('the tablet did not return a PDF');
    sh('mv ' + quote(part) + ' ' + quote(file));
  } finally {
    tryShell('rm -f ' + quote(part));
  }
  return file;
}

function pageList(spec, current, count) {
  spec = String(spec || 'current').trim().toLowerCase();
  let first, last;
  let m;
  if (spec === 'current') first = last = current;
  else if (spec === 'first') first = last = 1;
  else if (spec === 'last') first = last = count;
  else if ((m = spec.match(/^last (\d+)$/))) (first = count - Number(m[1]) + 1), (last = count);
  else if ((m = spec.match(/^(\d+)$/))) first = last = Number(m[1]);
  else if ((m = spec.match(/^(\d+)\s*-\s*(\d+)$/))) (first = Number(m[1])), (last = Number(m[2]));
  else throw new Error('pages must be a number, a range such as 2-4, first, last, "last 3" or current');
  first = Math.max(1, first);
  if (last > count || first > last) throw new Error('the document has ' + count + ' pages');
  if (last - first + 1 > MAX_PAGES) throw new Error('ask for at most ' + MAX_PAGES + ' pages at a time');
  const pages = [];
  for (let p = first; p <= last; p++) pages.push(p);
  return pages;
}

function renderPage(doc, pageNumber, width) {
  const page = doc.pageAtIndex(pageNumber - 1);
  const box = page.boundsForBox($.kPDFDisplayBoxMediaBox);
  const height = Math.round((width * box.size.height) / box.size.width);
  const image = page.thumbnailOfSizeForBox($.NSMakeSize(width, height), $.kPDFDisplayBoxMediaBox);
  const rep = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  return ObjC.unwrap(png.base64EncodedStringWithOptions(0));
}

// ---------------------------------------------------------------- uploads

function stagedCopy(name, bytes) {
  // Write content to a temporary file with the name the tablet should show.
  const dir = sh('mktemp -d -t indiigo-rm2-upload').trim();
  const file = dir + '/' + name;
  const data = $.NSData.alloc.initWithBase64EncodedStringOptions(bytes, $.NSDataBase64DecodingIgnoreUnknownCharacters);
  if (!data || Number(data.length) === 0) throw new Error('content is not valid base64');
  if (!data.writeToFileAtomically(file, true)) throw new Error('could not stage the file');
  return { file, dir };
}

function checkName(name) {
  if (!/\.(pdf|epub)$/i.test(name)) throw new Error('only PDF and EPUB files can be uploaded');
  if (/["\/;,]/.test(name)) throw new Error('the file name must not contain " / ; or ,');
  return name;
}

// ---------------------------------------------------------------- tools

const TOOLS = [
  {
    name: 'check',
    description: 'Check whether the reMarkable 2 tablet can be reached, over its USB cable or (if set up) Wi-Fi.',
    inputSchema: { type: 'object', properties: {} },
    run() {
      try {
        return text('connected: ' + connect());
      } catch (e) {
        return text('not connected');
      }
    },
  },
  {
    name: 'list',
    description:
      'List the folders and documents on the reMarkable 2, at the top level or inside a folder found by name (case-insensitive, searched in all folders).',
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string', description: 'Folder name; omit for the top level' } },
    },
    run(args) {
      let id = '';
      let path = '';
      if (args.folder) {
        const f = findFolder(String(args.folder));
        id = f.item.ID;
        path = f.path ? f.path + ' / ' + f.item.VisibleName : f.item.VisibleName;
      }
      return json(listFolder(id).map((item) => summary(item, path)));
    },
  },
  {
    name: 'view_pages',
    description:
      'Show pages of a document on the reMarkable 2 as images, handwriting included. The document is found by name (case-insensitive, partial match allowed, searched in all folders). Up to ' +
      MAX_PAGES +
      ' pages per call.',
    inputSchema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'Document name, e.g. General' },
        folder: { type: 'string', description: 'Folder name, to pick between documents with the same name' },
        pages: {
          type: 'string',
          description: 'A page number (from 1), a range such as 2-4, first, last, "last 3", or current (the page the tablet was last open on; the default)',
        },
      },
      required: ['document'],
    },
    run(args) {
      const found = findDocument(String(args.document), args.folder && String(args.folder));
      const item = found.item;
      const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(fetchPdf(item)));
      const count = Number(doc.pageCount);
      const pages = pageList(args.pages, Math.min((item.CurrentPage || 0) + 1, count), count);
      const content = [];
      for (const p of pages) {
        content.push({ type: 'text', text: item.VisibleName + ': page ' + p + ' of ' + count });
        content.push({ type: 'image', data: renderPage(doc, p, 1000), mimeType: 'image/png' });
      }
      return content;
    },
  },
  {
    name: 'upload',
    description:
      'Upload a PDF or EPUB to the reMarkable 2, at the top level or into a folder found by name. The document is named after the file, without the extension. Give either file_path (a file on this Mac) or content_base64 with file_name. The tablet cannot replace documents: if one with the same name is already in the folder, this fails unless allow_duplicate is true.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to the file on this Mac' },
        content_base64: { type: 'string', description: 'The file content, base64-encoded, when no Mac path is available' },
        file_name: { type: 'string', description: 'Name for the file, e.g. Todo 2026-10-20.pdf; required with content_base64' },
        folder: { type: 'string', description: 'Folder name; omit for the top level' },
        allow_duplicate: { type: 'boolean', description: 'Upload even if a document with the same name exists' },
      },
    },
    run(args) {
      let source;
      let staged = null;
      if (args.file_path && tryShell('test -f ' + quote(args.file_path)).ok) {
        const base = String(args.file_path).split('/').pop();
        const name = checkName(args.file_name ? String(args.file_name) : base);
        if (name === base) source = String(args.file_path);
        else {
          staged = { dir: sh('mktemp -d -t indiigo-rm2-upload').trim() };
          source = staged.dir + '/' + name;
          sh('cp ' + quote(args.file_path) + ' ' + quote(source));
        }
      } else if (args.content_base64) {
        if (!args.file_name) throw new Error('file_name is required with content_base64');
        staged = stagedCopy(checkName(String(args.file_name)), String(args.content_base64));
        source = staged.file;
      } else if (args.file_path) {
        throw new Error('file not found on this Mac: ' + args.file_path);
      } else {
        throw new Error('give file_path or content_base64');
      }
      try {
        let folderId = '';
        let where = 'the top level';
        if (args.folder) {
          const f = findFolder(String(args.folder));
          folderId = f.item.ID;
          where = 'the ' + f.item.VisibleName + ' folder';
        }
        const title = source.split('/').pop().replace(/\.(pdf|epub)$/i, '');
        const existing = listFolder(folderId).filter((i) => i.Type === 'DocumentType' && i.VisibleName === title);
        if (existing.length && !args.allow_duplicate)
          throw new Error('a document called "' + title + '" is already in ' + where + '; uploading again would add a second copy');
        uploadFile(folderId, source);
        return text('uploaded "' + title + '" to ' + where);
      } finally {
        if (staged) tryShell('rm -rf ' + quote(staged.dir));
      }
    },
  },
];

function text(s) {
  return [{ type: 'text', text: s }];
}

function json(value) {
  return text(JSON.stringify(value, null, 1));
}

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
        serverInfo: { name: 'indiigo reMarkable', version: '0.1.0' },
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
