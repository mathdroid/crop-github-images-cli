#!/usr/bin/env node
"use strict";

const { GifFrame, GifUtil, BitmapImage } = require("gifwrap");
const Jimp = require("jimp");
const updateNotifier = require("update-notifier");
const meow = require("meow");

const CONTAINER_WIDTH = 727;
const CUT_WIDTH = 325;
const CUT_HEIGHT = 100;
const CARD_PADDING_TOP = 37;
const CARD_PADDING_HORIZONTAL = 16;
const CARD_PADDING_BOTTOM = 16;
const CARD_MARGIN_BOTTOM = 16;
const CARD_HEIGHT = CARD_PADDING_TOP + CUT_HEIGHT + CARD_PADDING_BOTTOM;
const Y_OFFSET = CARD_HEIGHT + CARD_MARGIN_BOTTOM;
const MINIMUM_HEIGHT = 3 * CARD_HEIGHT + 2 * CARD_MARGIN_BOTTOM;

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
  console.error("Specify exactly one path to the image/gif");
  process.exit(1);
}

const getXY = index => {
  const isLeft = index % 2 === 0;
  // There is no margin between cards, instead, they are
  // separated by flex's space-between, which is directly
  // affected by container width. When someday container
  // width changes, we can just change its value and this
  // method will be fixed.
  const x = isLeft
    ? CARD_PADDING_HORIZONTAL
    : CONTAINER_WIDTH - (CARD_PADDING_HORIZONTAL + CUT_WIDTH);
  const indexFromTop = Math.floor(index / 2);
  const y = CARD_PADDING_TOP + indexFromTop * Y_OFFSET;
  return { x, y };
};

const cropFrame = image => {
  const cropped = [];
  for (let i = 0; i < 6; i++) {
    const clone = image.clone();
    const { x, y } = getXY(i);
    clone.crop(x, y, CUT_WIDTH, CUT_HEIGHT);
    cropped.push(clone);
  }
  return cropped;
};

const cropGithubGifs = async path => {
  try {
    const source = await GifUtil.read(path);
    const { frames } = source;
    let croppedGifs = [];
    let frameIndex = 1;
    for (const frame of frames) {
      console.log(`Processing frame ${frameIndex} of ${frames.length}`);
      const buf = frame.bitmap.data;
      frame.scanAllCoords((x, y, bi) => {
        buf[bi + 3] = 0xff;
      });

      let jimpToCrop = new Jimp(frame.bitmap.width, frame.bitmap.height, 0);
      jimpToCrop.bitmap.data = frame.bitmap.data;
      jimpToCrop.resize(CONTAINER_WIDTH, Jimp.AUTO);

      const frameToCrop = await Jimp.read(jimpToCrop);

      const cropped = cropFrame(frameToCrop).map(img => {
        return new GifFrame(img.bitmap);
      });

      cropped.forEach((croppedFrame, i) => {
        croppedFrame.scanAllCoords((x, y, bi) => {
          buf[bi + 3] = 0xff;
        });
        croppedGifs[i] = croppedGifs[i]
          ? [...croppedGifs[i], croppedFrame]
          : [croppedFrame];
      });

      frameIndex++;
    }

    croppedGifs.forEach(async (croppedFrames, i) => {
      console.log(
        `Quantizing Dekker value for gif ${i} (this might take a while)`
      );
      GifUtil.quantizeDekker(croppedFrames);
      await GifUtil.write(`${i}.gif`, croppedFrames);
      console.log(`saved ${i}.gif`);
    });
  } catch (error) {
    console.error(error);
  }
};

const cropGithubImages = async path => {
  const image = await Jimp.read(path);

  image.resize(CONTAINER_WIDTH, Jimp.AUTO);
  const cropped = cropFrame(image);

  for (let i = 0; i < cropped.length; i++) {
    const clone = cropped[i];
    await clone.writeAsync(`${i}.jpg`);
    console.log(i, "has been written.");
  }
};

if (cli.input[0].endsWith(".gif")) {
  cropGithubGifs(cli.input[0]);
} else {
  cropGithubImages(cli.input[0]);
}
