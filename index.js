const LocalImagesStorage = require("/var/lib/ghost/current/core/server/adapters/storage/LocalImagesStorage");

const path = require("path");
const sharp = require("sharp");
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
      const handleBufferRes = this.handleBufferRes(req, res, next);

      const filePath = (req.path || "").replace(/\/$|\\$/, "");
      const targetPath = path.join(this.storagePath, filePath);

      const image = sharp(targetPath);

      if (filePath.includes("size/w600")) {
        image.toBuffer(handleBufferRes);
      } else {
        image
          .composite([
            {
              input: `${__dirname}/logo.png`,
              gravity: "southeast",
            },
          ])
          .toBuffer(handleBufferRes);
      }
    };
  }

  handleBufferRes(req, res, next) {
    return (err, data, info) => {
      if (err) {
        this.handleError(err, next);
      }

      res.setHeader("Content-Type", mimeTypes[path.extname(req.path)]);
      res.setHeader("Cache-Control", "public, max-age=86400000"); // one day
      res.writeHead(200);
      res.end(data);
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
