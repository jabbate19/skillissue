const fs = require('mz/fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { Readable } = require('stream');
const colors = require('colors/safe');

// Setup frames in memory
let original;
let flipped;

(async () => {
  const framesPath = 'frames';
  const files = await fs.readdir(framesPath);

  original = await Promise.all(files.map(async (file) => {
    const frame = await fs.readFile(path.join(framesPath, file));
    return frame.toString();
  }));
  flipped = original.map(f => {
    return f
      .toString()
      .split('')
      .reverse()
      .join('')
  })
})().catch((err) => {
  console.log('Error loading frames');
  console.log(err);
});

const streamer = (stream, opts) => {
  let index = 0;
  let frame = null;
  const frames = opts.flip ? flipped : original;

  return setInterval(() => {
    // clear the screen
    stream.push('\033[2J\033[3J\033[H');

    stream.push(frames[index]);

    index = (index + 1) % frames.length;
  }, 70);
};

const validateQuery = ({ flip }) => ({
  flip: String(flip).toLowerCase() === 'true'
});

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({status: 'ok'}));
  }
  if (req.url === '/skillissue.gif') {
    fs.readFile('html/skillissue.gif',function (err, data){
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
    return;
  }
  if (
    req.headers &&
    req.headers['user-agent'] &&
    !req.headers['user-agent'].includes('curl')
  ) {
    fs.readFile('html/index.html',function (err, data){
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
    return;
  }

  const stream = new Readable();
  stream._read = function noop() {};
  stream.pipe(res);
  const interval = streamer(stream, validateQuery(url.parse(req.url, true).query));

  req.on('close', () => {
    stream.destroy();
    clearInterval(interval);
  });
});

const port = process.env.NODE_PORT || 3000;
server.listen(port, err => {
  if (err) throw err;
  console.log(`Listening on localhost:${port}`);
});
