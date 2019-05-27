# npm real-time replicate follower

Based off of https://github.com/npm/registry-follower-tutorial with the npm `concurrent-couch-follower` which is safer for operations that may require async (like a file write or a GraphQL mutation over http(s))

## Run

    git clone https://github.com/sgrove/npm-replicate-follower.git
    cd npm-replicate-follower
    npm install
    node index.js

That's it, you should see a crazy spew of data in your terminal now.
