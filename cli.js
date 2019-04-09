#!/usr/bin/env node
"use strict";

const Clipper = require("image-clipper");
const canvas = require("canvas");
const { GifFrame, GifUtil } = require("gifwrap");
const Jimp = require("jimp");
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

const cropGithubGifs = path => {
  const GIF_WIDTH = 325;
  const GIF_HEIGHT = 100;
  const VERTICAL_MARGIN = 53;
  const HORIZONTAL_MARGIN = 32;

  GifUtil.read(path)
    .then(source => {
      let croppedGifs = [];

      for (let i = 0; i < 6; i++) {
        const isLeft = i % 2 === 0;
        const x = isLeft ? 0 : GIF_WIDTH + HORIZONTAL_MARGIN;
        const y = Math.floor(i / 2) * (GIF_HEIGHT + VERTICAL_MARGIN);

        let gif = [];
        for (let frame = 0; frame < source.frames.length; frame++) {
          let j = new Jimp(
            source.frames[frame].bitmap.width,
            source.frames[frame].bitmap.height,
            0
          );
          j.bitmap.data = source.frames[frame].bitmap.data;
          j.resize(GIF_WIDTH * 2 + HORIZONTAL_MARGIN, GIF_HEIGHT * 3 + VERTICAL_MARGIN * 2)
            .crop(x, y, GIF_WIDTH, GIF_HEIGHT);
          gif[frame] = new GifFrame(j.bitmap);
        }      
        croppedGifs.push(gif);
      }

      croppedGifs.forEach((gif, i) => {
        GifUtil.quantizeDekker(gif);
        GifUtil.write(`${i}.gif`, gif).then(result => {
          console.log(`saved ${i}.gif`);
        });
      });
    })
    .catch(console.error); 
};

const WIDTH = 727;
const INTERVAL = 171;

const cropGithubImages = path => {
  const clipper = Clipper({ canvas });

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

if (cli.input[0].endsWith(".gif")) {
  cropGithubGifs(cli.input[0]);
} else {
  cropGithubImages(cli.input[0]);
}
