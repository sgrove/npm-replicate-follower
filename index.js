const ChangesStream = require("changes-stream");
const Normalize = require("normalize-registry-metadata");
var changes = require("concurrent-couch-follower");

const db = "https://replicate.npmjs.com";

var dataHandler = function(data, done) {
  if (data.doc.name) {
    // <-- make sure the change is a change
    console.log(Normalize(data.doc));
    done();
  }
};

var configOptions = {
  db: db,
  include_docs: true,
  sequence: ".sequence",
  now: false,
  concurrency: 5
};

changes(dataHandler, configOptions);
