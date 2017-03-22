/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

require("gpii-express");
//fluid.require("%gpii-express");

var fs     = require("fs");
var path   = require("path");
var mkdirp = require("mkdirp");

fluid.registerNamespace("gpii.testem.coverage.receiver");


// Adapted from `fluid.match`: https://github.com/fluid-project/infusion/blob/16a963d63dce313ab3f2e3a81c725c2cbef0af79/src/framework/core/js/FluidDocument.js#L31
// (We can't use it directly because the rest of that file is designed to work only in a browser).
gpii.testem.coverage.receiver.uaMatch = function (ua) {
    ua = ua.toLowerCase();

    var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
        /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
        /(msie) ([\w.]+)/.exec( ua ) ||
        ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) || [];

    return {
        name: match[ 1 ] || "unknown",
        version: match[ 2 ] || "0"
    };
};

gpii.testem.coverage.receiver.initMiddleware = function (that) {
    mkdirp(that.options.coverageDir);
};

gpii.testem.coverage.receiver.middlewareImpl = function (that, request, response) {
    var resolvedCoverageDir = fluid.module.resolvePath(that.options.coverageDir);

    var body         = JSON.parse(request.body.payload);

    var browser      = gpii.testem.coverage.receiver.uaMatch(fluid.get(body, "navigator.userAgent"));

    var testPath     = fluid.get(body.document, "URL");
    var testFilename = testPath ? testPath.split("/").pop(): "unknown";

    var coverageFilename    = ["coverage", "-", browser.name, "-", browser.version, "-", testFilename, "-", that.id, "-", Math.round(Math.random() * 10000), ".json"].join("");
    var coverageOutputPath  = path.join(resolvedCoverageDir, coverageFilename);

    fs.writeFile(coverageOutputPath, JSON.stringify(body.coverage, null, 2), { encoding: "utf8"}, function (error) {
        if (error) {
            response.status(500).send({ isError: true, message: error});
        }
        else {
            response.status(200).send({ message: "You have successfully saved your coverage report."});
        }
    });
};

fluid.defaults("gpii.testem.coverage.receiver.middleware", {
    gradeNames: ["gpii.express.middleware"],
    path:   "/",
    method: ["put", "post"],
    invokers: {
        middleware: {
            funcName: "gpii.testem.coverage.receiver.middlewareImpl",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    },
    listeners: {
        "onCreate.init": {
            funcName: "gpii.testem.coverage.receiver.initMiddleware",
            args:     ["{that}"]
        }
    }
});
