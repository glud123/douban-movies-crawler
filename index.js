const puppeteer = require("puppeteer");
const client = require("./db");
const assert = require("assert");
// Database Name
const dbName = "DouBanMovies";
// Use connect method to connect to the Server
client.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  crawler(db, () => {
    client.close();
  });
});

const crawler = (db, callback) => {
  puppeteer.launch().then(async (browser) => {
    let domItems = [];
    const page = await browser.newPage();
    page.on("load", async () => {
      domItems = domItems.concat(await page.evaluate(getMovieInfo));
      if ((await page.$(".paginator .thispage + a")) !== null) {
        await page.click(".paginator .thispage + a");
      } else {
        console.log(domItems.length);
        // Get the documents collection
        const collection = db.collection("Top250");
        // Insert some documents
        collection.insertMany(domItems, function (
          err,
          result
        ) {
          assert.equal(err, null);
          assert.equal(250, result.ops.length);
          console.log("Inserted 250 documents into the collection");
          callback(result);
        });
        browser.close();
        callback();
      }
    });
    await page.goto("https://movie.douban.com/top250");
  });
};

// 获取电影信息
const getMovieInfo = () => {
  const items = document.querySelectorAll(".grid_view .item");
  return Array.prototype.map.call(items, (item) => {
    return {
      num: item.querySelector(".pic em").innerText,
      img: item.querySelector(".pic img").src,
      link: item.querySelector(".pic a").href,
      title: item.querySelector(".info .hd a>.title").innerText,
      star: item.querySelector(".info .bd .star .rating_num").innerText,
    };
  });
};
