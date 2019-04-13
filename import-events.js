const https = require("https");
const fs = require("fs");

const combineEvents = function(oldEvents, newEvents) {
  let events = oldEvents;
  for(let n in newEvents) {
    let inc = true;
    for(let o in oldEvents) {
      if(oldEvents[o].url === newEvents[n].url) {
        inc = false;
      }
    }
    if(inc) {
      events.push(newEvents[n]);
    }
  }
  return events;
};

function loadEventsPage(p) {
  return new Promise(function (resolve, reject) {
    let events = [];
    https.get("https://www.eventbrite.co.uk/org/4307451563/showmore/?type=past&page=" + p, (resp) => {
      let data = "";
      resp.on("data", (chunk) => {
        data += chunk;
      });
      resp.on("end", function () {
        let d = JSON.parse(data);
        d.data.events.forEach(function (e) {
          events.push({
            "name": e.name.text,
            "city": e.venue.address.city,
            "date": e.start.local.replace(/T.*$/, ""),
            "url": e.url,
            "description": e.description.text
          });
        });
        if (d.data.has_next_page) {
          loadEventsPage(p + 1).then((newEvents) => {
            resolve(combineEvents(events, newEvents));
          });
        } else {
          resolve(events);
        }
      });
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  });
}

let oldEvents = JSON.parse(fs.readFileSync('src/_data/events.json'));

loadEventsPage(1).then(function (events) {
  events = combineEvents(oldEvents, events);
  events.sort(function(a, b){
    return a.date < b.date ? 1 : -1;
  });
  fs.writeFileSync('src/_data/events.json', JSON.stringify(events, null, 2));
  console.log("Events written to events.json");
}, function(){
  console.log("Events could not be written");
});
