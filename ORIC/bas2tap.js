var fs = require('fs');

fs.open('file.txt', 'r', function(status, fd) {
    if (status) {
        console.log(status.message);
        return;
    }
    var buffer = Buffer.alloc(100);
    fs.read(fd, buffer, 0, 100, 0, function(err, num) {
        console.log(buffer.toString('utf8', 0, num));
    });
});
