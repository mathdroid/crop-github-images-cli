#!/usr/bin/env node
"use strict";

const sharp = require("sharp");
const execa = require("execa");
const gifsicle = require("gifsicle");
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

const cropImage = async path => {
  try {
    const [ext, ...rest] = path.split(".").reverse();
    const image = sharp(path).resize(CONTAINER_WIDTH);
    for (let i = 0; i < 6; i++) {
      const filename = `${i}.${ext}`;
      const { x, y } = getXY(i);
      await image
        .clone()
        .extract({ left: x, top: y, width: CUT_WIDTH, height: CUT_HEIGHT })
        .toFile(filename);
      console.log(`Successfully cropped ${filename}.`);
    }
  } catch (e) {
    console.error(e);
  }
};

const cropGif = async path => {
  const resized = "resized.gif";
  await execa(gifsicle, ["--resize", "727x_", "-o", resized, path]);
  for (let i = 0; i < 6; i++) {
    const filename = `${i}.gif`;
    const { x, y } = getXY(i);
    await execa(gifsicle, [
      "--crop",
      `${x},${y}+${CUT_WIDTH}x${CUT_HEIGHT}`,
      "--output",
      filename,
      resized
    ]);
    console.log(`Successfully cropped ${filename}.`);
  }
};

const path = cli.input[0];
if (path.endsWith(".gif")) {
  cropGif(path);
} else {
  cropImage(path);
}
