'use strict';

// REVIEW: There is a package here called body-parser, which is used by the provided POST route. Be sure to install that and save it as a dependency after you create your package.json.
const bodyParser = require('body-parser').urlencoded({extended: true});
const PORT = process.env.PORT || 3000;

//TODO: Instantiate the ExpressJS framework and configure the app.use() middleware to interface with the file system to serve static resources.
// COMMENT: Why are our files in a "public" directory now? How does ExpressJS serve files?
//We have a public directory to organize the files that will be served to the "view". ExpressJS serves our local files by looking for them in the public folder and sends them to the "view".
const express = require('express');
const app = express();
app.use(express.static('./public'));

//TODO: Write a new route that will handle a request and send the new.html file back to the user. Create a route and callback that will serve up the new.html page via a separate URI.
app.get('/new', (request, response) => {
  response.sendFile('new.html', {root: './public'});
});

app.post('/articles', bodyParser, function(request, response) {
  // REVIEW: This route will receive a new article from the form page, new.html, and log that form data to the console. We will wire this up soon to actually write a record to our persistence layer!
  console.log(request.body);
  response.status(201).json(request.body); // this line was not in our starter code
  response.send('Record posted to server!!');
});

//TODO: Write a new route that will handle any other routes that were not defined and deliver a 404 status message to the user. See the ExpressJS docs for a hint. Create a 404 route to handle any requests other than index.html or new.html, and deliver a 404 status and a message to those invalid requests.
app.use((req, res) => {
  res.status(404).send('Sorry, that route does not exist.');
});
//REVIEW: Also possible to do a catch all with app.get('*'):
// app.get('*', (req, res) => {
//   res.status(404).send('Sorry that route does not exist.');
// });

//TODO: Ensure that the server is listening for incoming requests. Include a message to let you know on which port your server is running. Log to the console a message that lets you know which port your server has started on
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});