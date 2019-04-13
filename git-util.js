const execa = require("execa");

exports.cloneGistPath = hash =>
  execa("git", ["clone", `https://gist.github.com/${hash}.git`]);

exports.addAll = gitPath => execa("git", [`--git-dir=${gitPath}`, "add", "."]);

exports.commitAll = gitPath =>
  execa("git", [`--git-dir=${gitPath}`, "commit", "-am", '"update gist file"']);

exports.push = gitPath => execa("git", [`--git-dir=${gitPath}`, "push"]);
