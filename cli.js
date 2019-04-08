#!/usr/bin/env node
"use strict";

const Clipper = require("image-clipper");
const canvas = require("canvas");
const updateNotifier = require("update-notifier");
const meow = require("meow");

const cli = meow(
  `
	Usage
	  $ crop-github-images <path>
	Examples
	  $ crop-github-images unicorn.png 
`,
  {
    string: ["_"]
  }
);

updateNotifier({ pkg: cli.pkg }).notify();

if (cli.input.length === 0) {
  console.error("Specify at least one path");
  process.exit(1);
}

const clipper = Clipper({ canvas });

const WIDTH = 727;
const INTERVAL = 171;

const cropGithubImages = path => {
  for (let i = 0; i < 6; i++) {
    const isLeft = i % 2 === 0;
    const x = isLeft ? 16 : WIDTH - 16 - 325;
    const y = 53 + INTERVAL * Math.floor(i / 2 + 0.1);
    clipper.image(path, function() {
      const name = `${i}.jpg`;
      this.crop(x, y, 325, 100).toFile(`./${name}`, function() {
        console.log(`saved ${name}`);
      });
    });
  }
};

cropGithubImages(cli.input[0]);
