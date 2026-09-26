import fs from "fs";
import path from "path";
import https from "https";
import { Resvg } from "@resvg/resvg-js";

const dest = path.resolve("../logos");
fs.mkdirSync(dest, { recursive: true });

const icons = [
  ["angular", "DD0031"],
  ["html5", "E34F26"],
  ["css", "1572B6"],
  ["javascript", "F7DF1E"],
  ["typescript", "3178C6"],
  ["nodedotjs", "5FA04E"],
  ["express", "000000"],
  ["sqlite", "003B57"],
  ["socketdotio", "010101"],
  ["tailwindcss", "06B6D4"],
  ["visualstudiocode", "007ACC"],
  ["git", "F05032"],
  ["github", "181717"],
  ["prisma", "2D3748"],
  ["postman", "FF6C37"],
  ["plantuml", "845554"],
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 SquareOneReport" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(url + " -> " + res.statusCode));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const fileMap = {
  angular: "angular.png",
  html5: "html5.png",
  css: "css3.png",
  javascript: "javascript.png",
  typescript: "typescript.png",
  nodedotjs: "nodejs.png",
  express: "express.png",
  sqlite: "sqlite.png",
  socketdotio: "socketio.png",
  tailwindcss: "tailwind.png",
  visualstudiocode: "vscode.png",
  git: "git.png",
  github: "github.png",
  prisma: "prisma.png",
  postman: "postman.png",
  plantuml: "plantuml.png",
};

for (const [slug, color] of icons) {
  const url = `https://cdn.simpleicons.org/${slug}/${color}`;
  try {
    const svg = await get(url);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 256 } });
    const png = resvg.render().asPng();
    const name = fileMap[slug];
    fs.writeFileSync(path.join(dest, name), png);
    console.log("OK", name, png.length);
  } catch (e) {
    console.log("FAIL", slug, e.message);
  }
}
