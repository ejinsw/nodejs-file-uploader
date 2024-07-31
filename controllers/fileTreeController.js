const fs = require('fs')
const path = require('path');
const asyncHandler = require('express-async-handler')

class TreeNode {
    constructor(filePath, isDirectory, parentPath, childrenPaths = []) {
        this.filePath = filePath;
        this.isDirectory = isDirectory;
        this.parentPath = parentPath;
        this.childrenPaths = childrenPaths;
    }
}

const getPaths = async (directoryPath, folder) => {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, async (err, files) => {
            if (err) {
                return reject('Unable to scan directory: ' + err);
            }
            const promises = files.map(async (file) => {
                const pathToFile = path.join(directoryPath, file);
                const isDirectory = fs.lstatSync(pathToFile).isDirectory();
                let node = new TreeNode(pathToFile, isDirectory, directoryPath, []);
                folder.childrenPaths.push(node);
                if (isDirectory) {
                    await getPaths(pathToFile, node);
                }
            });
            await Promise.all(promises);
            resolve();
        });
    });
};

module.exports = {
    getPaths,
    TreeNode
}