var pubSubHubbub    = require("pubsubhubbub"),
    crypto          = require("crypto"),
    AWS             = require('aws-sdk'),
    Producer        = require('sqs-producer'),
    path            = require('path'),
    parseString     = require('xml2js').parseString;

AWS.config.loadFromPath( path.join(__dirname, './config', 'aws.json') );

const producer = Producer.create({
    queueUrl: 'https://sqs.us-east-1.amazonaws.com/970556883193/SuperViewQueue',
    sqs: new AWS.SQS()
});


pubsub = pubSubHubbub.createServer({
    callbackUrl: "https://pubsubhub.superview.tv",
    secret: "MyTopSecret"
}),

topic = "https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCeYVSbQgaLdvLBvaRz5Virw",
hub = "http://pubsubhubbub.appspot.com/";

pubsub.listen(3000);

pubsub.on("denied", function(data){
  console.log("Denied");
  console.log(data);
});

pubsub.on("subscribe", function(data){
  console.log("Subscribe");
  console.log(data);

  console.log("Subscribed "+topic+" to "+hub);
});

pubsub.on("unsubscribe", function(data){
  console.log("Unsubscribe");
  console.log(data);

  console.log("Unsubscribed "+topic+" from "+hub);
});

pubsub.on("error", function(error){
  console.log("Error");
  console.log(error);
});

pubsub.on("feed", function(data){
  submitFeedEvent(data.feed.toString());
});

pubsub.on("listen", function(){
  console.log("Server listening on port %s", pubsub.port);
});

submitSubscribeEvent = ( subscribeData ) => {
  producer.send({
    id: subscribeData.topic,
    body: JSON.stringify(subscribeData),
    messageAttributes: {
        type: { DataType: 'String', StringValue: 'GOOGLE_YOUTUBE_SUBSCRIBE' },
    }
  }, function(err) {
    if (err) console.log(err);
  });
}


submitFeedEvent = ( feedData ) => {

  parseString(feedData, function (err, result) {
    if ( !err ) {
      console.log(result);
      if ( result.feed && result.feed.entry ) {
        result.feed.entry.map( entry => {
          producer.send({
            id: entry['yt:videoId'][0],
            body: JSON.stringify(entry),
            messageAttributes: {
                type: { DataType: 'String', StringValue: 'GOOGLE_YOUTUBE_FEED' },
            }
          }, function(err) {
            if (err) console.log(err);
          });
        })
      }
    } else {
      console.log(err);
    }
  });
}