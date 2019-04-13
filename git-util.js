const execa = require("execa");

exports.cloneGistPath = hash =>
  execa("git", ["clone", `https://gist.github.com/${hash}.git`]);

exports.commitAll = gitPath =>
  execa("git", [`--git-dir=${gitPath}`, "commit", "-am", "update gist file"]);

exports.push = gitPath => execa("git", [`--git-dir=${gitPath}`, "push"]);
