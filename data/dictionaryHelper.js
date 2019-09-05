function paramByApp(params, key) {
  let app = 'default';
  if (process.env.APP && (Object.keys(params).includes(process.env.APP)
      && Object.keys(params[process.env.APP]).includes(key))) {
    app = process.env.APP;
  }
  return params[app][key];
}

function getGraphQL(graphQLParams) {
  const boardCounts = graphQLParams.boardCounts;
  const chartCounts = graphQLParams.chartCounts;
  let projectDetails = graphQLParams.projectDetails;
  if (typeof projectDetails === 'string') {
    projectDetails = graphQLParams[projectDetails];
  }
  return {
    boardCounts,
    chartCounts,
    projectDetails,
  };
}

const { params } = require('./parameters');

function paramSetup() {
  const countsAndDetails = getGraphQL(paramByApp(params, 'graphql'));
  return {
    boardCounts: countsAndDetails.boardCounts.map(item => item.graphql),
    chartCounts: countsAndDetails.chartCounts.map(item => item.graphql),
    projectDetails: countsAndDetails.projectDetails.map(item => item.graphql),
  };
}

module.exports = {
  getGraphQL,
  paramByApp,
  paramSetup,
};
