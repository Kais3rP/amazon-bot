const puppeteer = require("puppeteer");
const path = require("path");
const { writeFile } = require("fs/promises");

class Crawler {
  constructor(homepage, range, socket) {
    this.keywords = Object.keys(range);
    this.homepage = homepage;
    this.browser = null;
    this.pages = {};
    this.links = {};
    this.size = { width: 1920, height: 1080 };
    this.mobileSize = { width: 1024, height: 1080 };
    this.ssPath = path.join(
      process.cwd(),
      "/screenshots",
      `${/amazon\..+/.exec(this.homepage)[0]}`
    );
    this.browserConfig = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      "--ignore-certifcate-errors-spki-list",
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
    ];
    this.priceRange = range;
    this.itemsBought = ["Items Bought", "\n"];
    this.socket = socket;
  }

  async init() {
    console.log("INITIALIZING CRAWLER...");
    try {
      this.socket.emit("status-change", "Initializing...");
      this.browser = await puppeteer.launch({ args: this.browserConfig });
    } catch (e) {
      console.log(new Error("Couldn't initialize the browser"));
    }
  }

  async openPage(i) {
    console.log("OPENING PAGE... " + this.homepage);
    try {
      this.socket.emit("status-change", `Opening Page... ${this.homepage}`);
      this.socket.emit("homepage-change", this.homepage);
      const page = await this.browser.newPage();
      await page.setViewport(this.size);
      await page.goto(this.homepage);
      const policy = await page.$("#a-autoid-0");
      if (policy) await page.click("#a-autoid-0");
      this.pages[i] = page;
    } catch (e) {
      console.log(new Error(`Couldn't open ${this.homepage}, reason: ${e}`));
    }
  }

  async performSearch(i) {
    console.log(`PERFORMING SEARCH... ${this.homepage} of ${this.keywords[i]}`);
    const currentPage = this.pages[i];
    try {
      this.socket.emit(
        "status-change",
        `Performing search... ${this.homepage} of ${this.keywords[i]}`
      );
      this.socket.emit("keyword-change", this.keywords[i]);
      await currentPage.type("#twotabsearchtextbox", this.keywords[i]);
      await currentPage.click("input.nav-input");
      await currentPage.click("#nav-search-submit-button");
      await currentPage.waitForSelector(".s-result-item", { timeout: 10000 });
      //PERFORM FILTERING
      await this.filter(i);
      //WAIT FOR FULL LOAD AFTER FILTERING
      await currentPage.waitForTimeout(10000);
      //CHECK IF THERE IS PAGINATION
      const pagination = await currentPage.$(".a-pagination .a-last");
      if (pagination) {
        let nextPageDisabled = await currentPage.$(
          "li[class='a-disabled a-last']"
        );
        let counter = 0;
        while (!nextPageDisabled) {
          counter++;
          console.log("ITERATING PAGE NUMBER:", counter);
          const keys = this.keywords[i].split(" ");
          console.log("KEYS", keys);
          const links = await currentPage.$$eval(
            ".s-result-item h2 .a-link-normal",
            (items, keys, homepage) =>
              items
                .filter((item) => {
                  //NEED TO CHECK THAT THE ITEM IS EFFECTIVELY REFERING TO THE PROPER SEARCHED ITEM
                  //PREPARE TO QUERY THE HREF URL
                  const href = item.href;
                  const reg0 = new RegExp(keys[0], "i");
                  const reg1 = new RegExp(keys[1], "i");
                  const queryReg = new RegExp(
                    `(?<=${homepage}\/)[A-Za-z0-9\-]+`
                  );
                  const query = queryReg.exec(href)[0];

                  return reg0.test(query) && reg1.test(query);
                })
                .map((item) => item.href),
            keys,
            this.homepage
          );

          this.links[i] = this.links[i] ? [...this.links[i], ...links] : links;
          console.log("NEXT PAGE BUTTON?", !!pagination);
          await currentPage.waitForSelector(".a-pagination .a-last");
          await currentPage.click(".a-pagination .a-last");
          await currentPage.waitForSelector(".a-pagination .a-last");
          nextPageDisabled = await currentPage.$(
            "li[class='a-disabled a-last']"
          );
        }
      } else {
        const keys = this.keywords[i].split(" ");
        console.log("KEYS", keys);
        const links = await currentPage.$$eval(
          ".s-result-item h2 .a-link-normal",
          (items, keys, homepage) =>
            items
              .filter((item) => {
                //NEED TO CHECK THAT THE ITEM IS EFFECTIVELY REFERING TO THE PROPER SEARCHED ITEM
                //PREPARE TO QUERY THE HREF URL
                const href = item.href;
                const reg0 = new RegExp(keys[0], "i");
                const reg1 = new RegExp(keys[1], "i");
                const queryReg = new RegExp(`(?<=${homepage}\/)[A-Za-z0-9\-]+`);
                const query = queryReg.exec(href)[0];

                return reg0.test(query) && reg1.test(query);
              })
              .map((item) => item.href),
          keys,
          this.homepage
        );
        console.log("LINKS FOUND:", links);
        this.links[i] = links;
      }
      await currentPage.close();
      return this.links[i].length;
    } catch (e) {
      console.log(
        `Couldn't perform the search in ${this.homepage},\n reason:\n ${e}\n Stack: ${e.stack}`
      );
    }
  }

  async filter(i) {
    console.log("FILTERING RESULTS...");
    const currentPage = this.pages[i];
    try {
      this.socket.emit("status-change", `Filtering results...`);
      //FILTER ONLY SHIPPED BY AMAZON
      await currentPage.waitForSelector("#primeRefinements", {
        timeout: 10000,
      });
      await currentPage.click("#primeRefinements li");
      //FILTER BY PRICE RANGE
      console.log(this.keywords[i], this.priceRange[this.keywords[i]]);
      const [min, max] = this.priceRange[this.keywords[i]];
      console.log("MIN PRICE:", min, "MAX PRICE:", max);
      /* await currentPage.waitForTimeout(10000)
        await currentPage.screenshot({
          path: `${this.ssPath}-after-first-filter-${this.keywords[i]}.png`,
          fullPage: true
        }); */
      await currentPage.waitForSelector("#low-price", { timeout: 10000 });
      /*   await currentPage.screenshot({
          path: `${this.ssPath}-after-first-filter.png`,
        }); */
      await currentPage.type("#low-price", min.toString());
      await currentPage.type("#high-price", max.toString());
      await currentPage.click("#p_36\\/price-range input[type='submit']");
      await currentPage.waitForNavigation({ timeout: 10000 });
    } catch (e) {
      console.log(
        new Error(
          `Couldn't filter the results in ${this.homepage},\n reason:\n ${e}`
        )
      );
    }
  }

  async afterBuyLogin(page, i) {
    console.log("LOGGING IN...", i);
    try {
      this.socket.emit("status-change", `Logging in...`);
      await page.waitForSelector("#ap_email", {
        timeout: 2000,
      });
      console.log("ALREADY LOGGED IN...");
      //BREAK IF IT'S ALREADY LOGGED IN
    } catch {
      return true;
    }
    await page.type("#ap_email", process.env.EMAIL);
    await page.click("#continue");
    await page.waitForSelector("#ap_password");
    await page.type("#ap_password", process.env.PASSWORD);
    await page.click("input[name='rememberMe']");
    await page.click("#signInSubmit");
    await page.waitForTimeout(10000);
    return false;
  }

  async performBuy(j) {
    console.log("PERFORMING BUY...");
    try {
      //LOOP THROUGH ALL THE ITEMS FOUND
      for (const [i, link] of Object.entries(this.links[j])) {
        //NAVIGATE TO THE ITEM PAGE

        console.log("NAVIGATING TO ITEM PAGE");
        console.log("HREF", link);
        this.socket.emit("status-change", `Opening item link... ${link}`);
        const page = await this.browser.newPage();
        await page.setViewport(this.size);
        await page.goto(link);
        const ssLink = link.replace(/[\/?:\.%&]/g, "");
        await page.screenshot({
          path: `${this.ssPath}${ssLink}.png`,
          fullPage: true,
        });
        //CHECK IF THE ITEM IS REALLY AVAILABLE
        const buyBtn = await page.$("#buy-now-button");
        if (buyBtn) {
          let isAlreadyLogged;
          await page.click("#buy-now-button");
          //CHECK THE 3 DIFFERENT SCENARIOS AFTER BUY BUTTON IS CLICKED:
          // -1 Not Logged in
          // 2- Logged in -> new page for confirm
          // 3 - Logged in -> modal iframe for confirm
          //PERFORM LOGIN
          try {
            isAlreadyLogged = await this.afterBuyLogin(page, j);
          } catch (e) {
            throw new Error("Couldn't login, reason: " + e);
          }
          try {
            // THE BUTTON IS INSIDE AN IFRAME
            const iframeHandle = await page.waitForSelector(
              "#turbo-checkout-iframe",
              { timeout: 10000 }
            );
            const iframe = await iframeHandle.contentFrame();
            //(disabled in dev mode)
            await iframe.click("#turbo-checkout-pyo-button");
            this.itemsBought.push(link, "\n");
            await page.close();
            console.log("BOUGHT SUCCESSFUL");
            this.socket.emit(
              "status-change",
              `Item bought ${this.keywords[i]}`
            );
            this.socket.emit("link-bought", link);
          } catch (e) {
            console.log(
              "CAN'T FIND THE I-FRAME TO CONFIRM THE PAYMENT, TRYING TO PAY WITH THE STANDARD PAGE..."
            );

            try {
              await page.waitForSelector("#checkoutDisplayPage", {
                timeout: 10000,
              });
              await page.screenshot({
                path: `${this.ssPath}-confirmpayment.png`,
                fullPage: true,
              });
              let confirmBtn;
              confirmBtn = await page.$(
                "input[name='ppw-widgetEvent:SetPaymentPlanSelectContinueEvent']"
              );
              console.log("CONFIRM BUTTON FOUND?", !!confirmBtn);
              if (confirmBtn)
                await page.click(
                  "input[name='ppw-widgetEvent:SetPaymentPlanSelectContinueEvent']"
                );
              else await page.click("input[name='placeYourOrder1']");
              this.itemsBought.push(link, "\n");
              console.log(
                `Bought successfully ${this.keywords[j]} in ${this.homepage}`
              );
              this.socket.emit(
                "status-change",
                `Item bought ${this.keywords[i]}`
              );
              this.socket.emit("link-bought", link);
            } catch (e) {
              console.log(
                `Aborting payment of ${this.keywords[j]} in ${this.homepage}, reason: ${e}`
              );
            }
          }
        } else {
          console.log(
            `Can't buy the ${this.keywords[j]} in ${this.homepage}, because it's not currently available`
          );
        }
        await page.close();
      }
    } catch (e) {
      console.log(`Error: ${e}, \n Stack: ${e.stack}`);
    }
  }

  async saveLog() {
    try {
      this.socket.emit(
        "status-change",
        `Saving log: ${new Date().toLocaleString()}`
      );
      const _path = path.join(
        process.cwd(),
        "logs",
        `log-${new Date().toLocaleString().replace(/[\/,\s:]/g, "-")}.txt`
      );
      console.log("SAVING LOG", _path);
      await writeFile(_path, this.itemsBought);
    } catch (e) {
      console.log("Couldn't log file \n Reason: \n" + e);
    }
  }

  async crawl() {
    this.isActive = true;
    try {
      await this.init();
      await Promise.all(
        this.keywords.map(async (keyword, i) => {
          await this.openPage(i);
          const nOfLinks = await this.performSearch(i);
          console.log(nOfLinks + "ITEMS HAVE BEEN FOUND!");
          if (nOfLinks > 0) {
            await this.performBuy(i);
            await this.saveLog();
          } else {
            this.socket.emit("status-change", `No item found this round :-(`);
            console.log("NO ITEM HAS BEEN FOUND THIS ROUND :-(");
          }
        })
      );
      console.log("HOMEPAGE: ", this.homepage, " CRAWLING HAS ENDED");
    } catch (e) {
      this.socket.emit("abort")
      throw new Error(`SOMETHING WENT WRONG DURING CRAWLING:\n ${e}`);
    }
  }
}

module.exports = Crawler;
