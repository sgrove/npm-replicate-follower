const ChangesStream = require("changes-stream");
const Normalize = require("normalize-registry-metadata");
const changes = require("concurrent-couch-follower");
const axios = require("axios");

const db = "https://replicate.npmjs.com";

const upsertPackageWithAuthorMutation = `
mutation upsertPackageWithAuthor($description: String, $id: String!, $license: String, $name: String!, $readme: String, $rev: String!, $authorEmail: String, $authorName: String, $createdAt: timestamptz, $updatedAt: timestamptz) {
  insert_npm_package(objects: {description: $description, id: $id, license: $license, name: $name, readme: $readme, rev: $rev, created_at: $createdAt, updated_at: $updatedAt, author: {data: {email: $authorEmail, name: $authorName}, on_conflict: {constraint: author_email_key, update_columns: [name]}}}, on_conflict: {constraint: npm_package_pkey, update_columns: [description, id, license, name, readme, rev]}) {
    affected_rows
  }
}`;

const upsertPackageWithoutAuthorMutation = `
mutation upsertPackageWithoutAuthor($description: String, $id: String!, $license: String, $name: String!, $readme: String, $rev: String!, $createdAt: timestamptz, $updatedAt: timestamptz) {
  insert_npm_package(objects: {description: $description, id: $id, license: $license, name: $name, readme: $readme, rev: $rev, created_at: $createdAt, updated_at: $updatedAt}, on_conflict: {constraint: npm_package_pkey, update_columns: [description, id, license, name, readme, rev]}) {
    affected_rows
  }
}
`;

var counter = 0;
const reqsInFlight = {};

var dataHandler = function(data, done) {
  if (data.doc.name) {
    // <-- make sure the change is a change
    const npm = Normalize(data.doc);
    // console.log(
    //   `${npm.name} [${npm.license}]: ${npm.description} by ${npm.author &&
    //     npm.author.email}`
    // );
    // console.log(npm);

    const license = (npm.license && npm.license.type) || npm.license;

    const time = !!npm.time && {
      createdAt: npm.time.created,
      updatedAt: npm.time.modified
    };

    const package = {
      ...time,
      id: npm._id,
      rev: npm._rev,
      name: npm.name,
      description: npm.description,
      license,
      readme: npm.readme
    };

    const hasAuthor = !!(npm.author && npm.author.email);

    const query = hasAuthor
      ? upsertPackageWithAuthorMutation
      : upsertPackageWithoutAuthorMutation;

    if (hasAuthor) {
      package.authorEmail = npm.author.email;
      package.authorName = npm.author.name;
    }

    const reqId = ++counter;
    reqsInFlight["" + reqId] = true;

    console.log(`Starting req ${reqId}: ${npm.name}`);

    axios
      .post("http://localhost:8080/v1/graphql", {
        query: query,
        variables: package
      })
      .then(function(response) {
        // console.log(`\tFinished [success] req ${reqId}: ${npm.name}`);
        delete reqsInFlight["" + reqId];

        // console.log(response);
        done();
      })
      .catch(function(error) {
        console.log(
          `\tFinished [error: (${error.code})] req ${reqId}: ${npm.name}`
        );
        delete reqsInFlight["" + reqId];

        // console.log(error);
        done();
      });

    // axios
    //   .get("https://serve.onegraph.io/")
    //   .then(function(response) {
    //     console.log(response);
    //     done();
    //   })
    //   .catch(function(error) {
    //     console.log(error);
    //     done();
    //   });
  }
};

var configOptions = {
  db: db,
  include_docs: true,
  sequence: ".sequence",
  now: false,
  concurrency: 100
};

changes(dataHandler, configOptions);

setInterval(() => {
  console.log(
    "Current reqs in flight: ",
    JSON.stringify(Object.keys(reqsInFlight).sort(), null, 2)
  );
}, 5000);
