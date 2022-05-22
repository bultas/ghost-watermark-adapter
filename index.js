const LocalImagesStorage = require("/var/lib/ghost/current/core/server/adapters/storage/LocalImagesStorage");

const path = require("path");
const Jimp = require("jimp");
const watermark = require("image-watermark");
// const etag = require("etag");

const errors = require("@tryghost/errors");
const tpl = require("@tryghost/tpl");

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
};

class Watermark extends LocalImagesStorage {
  constructor() {
    super();
  }

  serve() {
    return (req, res, next) => {
      const filePath = (req.path || "").replace(/\/$|\\$/, "");
      const targetPath = path.join(this.storagePath, filePath);

      Jimp.read(targetPath, async (err, jimpObject) => {
        if (err) {
          this.handleError(err, next);
        }

        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const img = jimpObject.print(
          font,
          10,
          350,
          "All copyrights @https://www.madeirago.cz"
        );

        img.getBuffer(Jimp.AUTO, (err, buffer) => {
          if (err) {
            this.handleError(err, next);
          }

          res.setHeader("Content-Type", mimeTypes[path.extname(req.path)]);
          res.setHeader("Cache-Control", "public, max-age=86400000"); // one day
          // res.setHeader("ETag", etag(buffer));
          res.writeHead(200);
          res.end(buffer);
        });
      });
    };
  }

  handleError(err, next) {
    if (err.statusCode === 404) {
      return next(
        new errors.NotFoundError({
          message: tpl(errorMessages.notFound),
          code: "STATIC_FILE_NOT_FOUND",
          property: err.path,
        })
      );
    }

    if (err.statusCode === 400) {
      return next(new errors.BadRequestError({ err: err }));
    }

    if (err.statusCode === 403) {
      return next(new errors.NoPermissionError({ err: err }));
    }

    return next(new errors.InternalServerError({ err: err }));
  }
}

module.exports = Watermark;
