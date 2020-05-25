var fs=require('fs');
var request=require("request");

const download = (url,path,callback) => {
    request.head(url, (err,res,body) => {
        request(url).pipe(fs.createWriteStream(path)).on('close',callback);
    });
};
const url="https://scontent.ffco3-1.fna.fbcdn.net/v/t31.0-8/18489801_648751651985532_1743232448869573153_o.jpg?_nc_cat=102&_nc_sid=e007fa&_nc_ohc=jTJfhgWhxlQAX8Zth1R&_nc_ht=scontent.ffco3-1.fna&oh=ba9480cb128e3ee223c9e9b6dffad9ba&oe=5EEB75EB";
const path = './fbimages/image.png';

download(url,path, () => {
    console.log("Done!");
});


