# iLoominate

iLoominate will be an app for templating, writing, and printing books for beginning
readers. It will support multiple languages, help writers use the letters and
words which children have learned, and support best practices and common layouts
for printing books.

<img src="http://i.imgur.com/kjOXrko.png"/>

## Contest

This project is developed as an entry to the Enabling Writers contest from
USAID / All Children Reading.

Requirements and implementation notes are [in the wiki](https://github.com/mapmeld/homer/wiki).

## Education

iLoominate supports "word lists" and "letter lists" to help writers use letters and words
appropriate for students' grade level. For example, if a writer types the phrase: "A man a plan a canal
Panama" the program will highlight any letters or words which are not on the list.

Letter lists and word lists are also tested in Arabic and Devanagari scripts.

## Organizations

Books can be created and saved with or without a user account.

You need a user account to store or upload content online. A user account can
be created with an e-mail address and a password.

A team (such as "UnleashKids") can be created by any user. Then other users can
ask to join the team. In the future, the Team Leader will accept, reject, and invite
users to the team.

Teams share all of their users' word lists and images. In the future, the Team Leader
will add and delete this content.

## Technology

The app must be available online and offline. The online portion of the
activity will be deployed on Heroku, using a
Node.js server. The main storybook editor will be available through the site,
and offline as a Google Chrome app.

Includes:
* [antihighlight](https://github.com/mapmeld/jQuery-antihighlight) fork of [highlightTextarea](http://www.strangeplanet.fr/work/jquery-highlighttextarea/) - GPL/MIT licenses
* [Blockee](https://github.com/codeforamerica/blockee) - sprite code, BSD license
* [Bootstrap / Bootswatch](http://bootswatch.com/lumen/) - MIT license
* [JavaScript-MD5](https://github.com/blueimp/JavaScript-MD5) - MIT license
* [jQuery 1.x](https://github.com/jquery/jquery/tree/1.x-master) - MIT license
* [jQuery.IME](https://github.com/wikimedia/jquery.ime) - GPL/MIT licenses
* [jsPDF](https://github.com/MrRio/jsPDF) - MIT license
* [KineticJS](https://github.com/ericdrowell/KineticJS/) - GPL/MIT licenses
* [polyglot.js](https://github.com/airbnb/polyglot.js) - BSD license
* [turn.js](https://github.com/blasten/turn.js) - non-commercial BSD license

Public Domain icons from [The Noun Project](http://thenounproject.com/).

Web server uses Node.js with libraries Express, Passport, and Mongoose.

Tests are run using Mocha and continuous integration on travis-ci.org - Link to latest build:

[![Build Status](https://travis-ci.org/mapmeld/iloominate.png)](https://travis-ci.org/mapmeld/iloominate)

Configuring cloud server on Heroku:

    heroku addons:add mongolab:starter
    heroku config:set SECRET='your_secret_passcode_token'

## Licensing

iLoominate will be open source (MIT license) and be built with several other open
source libraries.
