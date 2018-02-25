'use strict';

const pg = require('pg');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const app = express();
const conString = 'postgres://localhost:5432/kilovolt'; // Don't forget to set your own conString
const client = new pg.Client(conString);
client.connect();
client.on('error', error => {
  console.error(error);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./public'));

// REVIEW: These are routes for requesting HTML resources.
app.get('/new', (request, response) => {
  response.sendFile('new.html', {root: './public'});
});

// REVIEW: These are routes for making API calls to enact CRUD operations on our database.
app.get('/articles', (request, response) => {
  // REVIEW: This query will join the data together from our tables and send it back to the client. Write the SQL query which joins all data from articles and authors tables on the author_id value of each
  client.query( // controller to model
    `SELECT * FROM articles
    INNER JOIN authors
    ON articles.author_id=authors.author_id;`
  )
    .then(result => { // result is entire joined table from query above
      response.send(result.rows); //send the result rows back to article.js (view)
    })
    .catch(err => {
      console.error(err)
    });
});

app.post('/articles', (request, response) => {
  // REVIEW: Write the SQL query to insert a new author, ON CONFLICT DO NOTHING. Add the author and authorURL as dara for the SQL query.
  client.query(
    `INSERT INTO
    authors(author, "authorUrl")
    VALUES($1, $2) 
    ON CONFLICT DO NOTHING;
    `,
    [
      request.body.author,
      request.body.authorUrl
    ],
    function(err) {
      if (err) console.error(err);
      // REVIEW: This is our second query, to be executed when this first query is complete.
      queryTwo();
    }
  )

  function queryTwo() {
    // REVIEW: Write a SQL query to retrieve the author_id from the authors table for the new article. Add the author name as data for the SQL query.
    client.query(
      `SELECT * FROM authors WHERE author=$1;`,
      [request.body.author],
      function(err, result) {
        if (err) console.error(err);
        // REVIEW: This is our third query, to be executed when the second is complete. We are also passing the author_id into our third query.
        queryThree(result.rows[0].author_id);
      }
    )
  }

  function queryThree(author_id) {
    // REVIEW: Write a SQL query to insert the new article using the author_id from our previous query. Add the data from our new article, inlcuding the author_id, as data for the SQL query.
    client.query(
      `INSERT INTO articles (author_id, title, category, "publishedOn", body)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [
        author_id,
        request.body.title,
        request.body.category,
        request.body.publishedOn,
        request.body.body
      ],
      function(err) {
        if (err) console.error(err);
        response.send('insert complete');
      }
    );
  }
});

app.put('/articles/:id', function(request, response) {
  // REVIEW: Write a SQL query to update an author record. Remember that our articles now have an author_id property, so we can reference it from the request.body. Add the required values from the request as data for the SQL query to interpolate.
  client.query(
    `UPDATE authors
    SET author=$1, "authorUrl"=$2
    WHERE author_id=$3
    `,
    [
      request.body.author,
      request.body.authorUrl,
      request.body.author_id
    ]
  )
    .then(() => {
      // REVIEW: Write a SQL query to update an article record. Keep in mind that article records now have an author_id, in addition to title, category,  publishedOn, and body.Add the required values from the request as data for the SQL query to interpolate.
      client.query(
        `UPDATE articles
        SET author_id=$1, title=$2, category=$3, "publishedOn"=$4, body=$5
        WHERE article_id=$6;
        `,
        [
          request.body.author_id,
          request.body.title,
          request.body.category,
          request.body.publishedOn,
          request.body.body,
          request.params.id
        ]
      )
    })
    .then(() => {
      response.send('Update complete');
    })
    .catch(err => {
      console.error(err);
    })
});

app.delete('/articles/:id', (request, response) => {
  client.query(
    `DELETE FROM articles WHERE article_id=$1;`,
    [request.params.id]
  )
    .then(() => {
      response.send('Delete complete');
    })
    .catch(err => {
      console.error(err)
    });
});

app.delete('/articles', (request, response) => {
  client.query('DELETE FROM articles')
    .then(() => {
      response.send('Delete complete');
    })
    .catch(err => {
      console.error(err)
    });
});

// REVIEW: This calls the loadDB() function, defined below.
loadDB();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}!`);
});


//////// ** DATABASE LOADERS ** ////////
////////////////////////////////////////

// REVIEW: This helper function will load authors into the DB if the DB is empty.
function loadAuthors() {
  fs.readFile('./public/data/hackerIpsum.json', 'utf8', (err, fd) => {
    JSON.parse(fd).forEach(ele => {
      client.query(
        'INSERT INTO authors(author, "authorUrl") VALUES($1, $2) ON CONFLICT DO NOTHING',
        [ele.author, ele.authorUrl]
      )
    })
  })
}

// REVIEW: This helper function will load articles into the DB if the DB is empty.
function loadArticles() {
  client.query('SELECT COUNT(*) FROM articles')
    .then(result => {
      if(!parseInt(result.rows[0].count)) {
        fs.readFile('./public/data/hackerIpsum.json', 'utf8', (err, fd) => {
          JSON.parse(fd).forEach(ele => {
            client.query(`
            INSERT INTO
            articles(author_id, title, category, "publishedOn", body)
            SELECT author_id, $1, $2, $3, $4
            FROM authors
            WHERE author=$5;
            `,
            [ele.title, ele.category, ele.publishedOn, ele.body, ele.author]
            )
          })
        })
      }
    })
}

// REVIEW: Below are two queries, wrapped in the loadDB() function, which create separate tables in our DB, and create a relationship between the authors and articles tables.
// THEN they load their respective data from our JSON file.
function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    authors (
      author_id SERIAL PRIMARY KEY,
      author VARCHAR(255) UNIQUE NOT NULL,
      "authorUrl" VARCHAR (255)
    );`
  )
    .then(data => {
      loadAuthors(data);
    })
    .catch(err => {
      console.error(err)
    });

  client.query(`
    CREATE TABLE IF NOT EXISTS
    articles (
      article_id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES authors(author_id),
      title VARCHAR(255) NOT NULL,
      category VARCHAR(20),
      "publishedOn" DATE,
      body TEXT NOT NULL
    );`
  )
    .then(data => {
      loadArticles(data);
    })
    .catch(err => {
      console.error(err)
    });
}
