#!/usr/bin/env node
"use strict";

const { parse, resolve } = require("path");
const fs = require("fs");

const sharp = require("sharp");
const execa = require("execa");
const gifsicle = require("gifsicle");
const updateNotifier = require("update-notifier");
const meow = require("meow");
const got = require("got");
const cp = require("cp-file");

const { cloneGistPath, commitAll, push } = require("./git-util");

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
    flags: {
      "github-token": {
        type: "string",
        alias: "t"
      }
    }
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
    const { ext } = parse(path);
    const image = sharp(path);
    const { width, height } = await image.metadata();
    const resizeOpts =
      width / height >= CONTAINER_WIDTH / MINIMUM_HEIGHT
        ? { width: CONTAINER_WIDTH, height: MINIMUM_HEIGHT, fit: "outside" }
        : { width: CONTAINER_WIDTH };
    const resized = image.clone().resize(resizeOpts);
    const files = [];
    for (let i = 0; i < 6; i++) {
      const filename = `${i}.${ext}`;
      const { x, y } = getXY(i);
      await resized
        .clone()
        .extract({ left: x, top: y, width: CUT_WIDTH, height: CUT_HEIGHT })
        .toFile(filename);
      console.log(`Successfully cropped ${filename}.`);
      files.push(filename);
    }
    return files;
  } catch (e) {
    console.error(e);
  }
};

const cropGif = async path => {
  try {
    const { width, height } = await sharp(path).metadata();
    const resizeOpts =
      width / height >= CONTAINER_WIDTH / MINIMUM_HEIGHT
        ? ["--resize", "_x513"]
        : ["--resize", "727x_"];
    const resized = "resized.gif";
    await execa(gifsicle, [...resizeOpts, "-o", resized, path]);
    const files = [];
    for (let i = 0; i < 6; i++) {
      const filename = `${i}.gif`;
      const { x, y } = getXY(i);
      await execa(gifsicle, [
        "--crop",
        `${x},${y}+${CUT_WIDTH}x${CUT_HEIGHT}`,
        "-o",
        filename,
        resized
      ]);
      console.log(`Successfully cropped ${filename}.`);
      files.push(filename);
    }
    return files;
  } catch (e) {
    console.error(e);
  }
};

const crop = async (path, githubToken) => {
  let files = [];
  const isGif = path.endsWith(".gif");
  if (isGif) {
    files = await cropGif(path);
  } else {
    files = await cropImage(path);
  }
  if (githubToken) {
    try {
      for (const file of files) {
        const files = {
          [file]: {
            content: "Hello"
          }
        };
        const body = JSON.stringify({
          description: `Gist for ${file}`,
          public: true,
          files
        });
        const { body: res } = await got.post("gists", {
          baseUrl: "https://api.github.com",
          headers: {
            Authorization: `token ${githubToken}`
          },
          body
        });
        const data = JSON.parse(res);
        console.log(`Prepared the gist for ${file} in ${data.html_url}`);
        await cloneGistPath(data.id);
        await cp(file, `${data.id}/${file}`);
        const gitPath = resolve(`./${data.id}/.git`);
        await commitAll(gitPath);
        fs.writeFileSync(
          `${data.id}/.netrc`,
          `machine github.com\nlogin ${
            data.owner.login
          }\npassword ${githubToken}`
        );
        await push(gitPath);
        console.log(
          `${isGif ? "GIF" : "Image"} ${file} has been added to the gist`
        );
      }
    } catch (e) {
      console.error(e);
    }
  }
};

const path = cli.input[0];
const { githubToken } = cli.flags;

crop(path, githubToken);
