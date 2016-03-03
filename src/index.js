/**
 * This is the boilerplate repository for creating joules.
 * Forking this repository should be the starting point when creating a joule.
 */

/*
 * The handler function for all API endpoints.
 * The `event` argument contains all input values.
 *    event.httpMethod, The HTTP method (GET, POST, PUT, etc)
 *    event.{pathParam}, Path parameters as defined in your .joule.yml
 *    event.{queryStringParam}, Query string parameters as defined in your .joule.yml
 */
var Response = require('joule-node-response');
var JiraClient = require('jira-connector');

// {response_type: "in_channel", attachments: [{title: name, text: contactString, thumb_url: user['profile']['image_72'], fallback: "Required plain-text summary of the attachment."}]};
var createTitle = function(issue) {
  return issue.key + ' ' + issue.fields.summary + ' (assigned: ' + issue.fields.assignee.name + ')';
};
var createDescription = function(issue) {
  var desc = issue.fields.description.substr(0, 100);
  if(issue.fields.description.length > 100)
    desc += '...';
  return desc;
};

var SlackResponse = function() {
  var response = {text: "Your search results.", attachments: []};

  this.addEntry = function(issue) {
    response.attachments.push({title: createTitle(issue), title_link: issue.self});
  };

  this.getResponse = function() {
    return response;
  };
};

exports.handler = function(event, context) {
  console.log(event);
  var response = new Response()
      , slackResponse = new SlackResponse()
      , keyword = '';
  response.setContext(context);
  response.setContentType('application/json');

  var jira = new JiraClient( {
    host: process.env.JIRA_HOST,
    basic_auth: {
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_PASSWORD
    }
  });

  var command = 'search';
  if(event.path.length > 0) {
    command = event.path[0];
  }

  console.log('command ' + command);

  switch(command) {
    case 'rollup':
      // project = PLEYBART AND fixVersion = Sprint-03-08-2016 and assignee = anuragp
      if(event.query['text']) {
        username = event.query['text'];
      } else if(event.post['text']) {
        username = event.post['text'];
      }

      jira.search.search({"jql": "project = PLEYBART AND fixVersion = Sprint-03-08-2016 and assignee = "+username, maxResults: 5}, function(err, results) {
        console.log(err);
        console.log(results);
        if(err) {
          response.setHttpStatusCode(500);
          response.send({error: 'Error from call'});
          return;
        }

        for(var r in results.issues) {
          slackResponse.addEntry(results.issues[r]);
        }
        response.send(slackResponse.getResponse());
      });
      
    case 'search':
    default:
      if(event.query['text']) {
        keyword = event.query['text'];
      } else if(event.post['text']) {
        keyword = event.post['text'];
      }

      jira.search.search({"jql": "text ~ '\""+keyword+"\"'", maxResults: 5}, function(err, results) {
        console.log(err);
        console.log(results);
        if(err) {
          response.setHttpStatusCode(500);
          response.send({error: 'Error from call'});
          return;
        }

        for(var r in results.issues) {
          slackResponse.addEntry(results.issues[r]);
        }
        response.send(slackResponse.getResponse());
      });
      break;
  }
};
