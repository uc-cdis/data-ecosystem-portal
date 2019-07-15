# Data Ecosystem Portal

The DEF serves 2 sub-commons at sub1.example.com and sub2.example.com with a centralized commons at example.com running Fence, Indexd, and Arborist.
When logged in at example.com, requests sent to both sub1 and sub2 are allowed to carry the same authentication cookie, therefore extra login is not needed for sub1 or sub2. 
The DEF was created using Windmill Data Explorer and the Unity Portal.
The login component will save an `access_token` to `sessionStorage` for each commons that will be used for accessing the data in the explorer.

## Running locally
`npm install`

Export the appropriate client ids for the commons:
`export REACT_APP_CLIENT_ID_${commonsAbbreviation}=...`

Then start:
`npm start`

Navigate to `localhost:8000` to see the commons.

## Adding a commons
In order for the DEF to connect to a commons, it needs an object added to the `commonsList`
array in `src/config.js`. This takes the form:

```
{
  'name': ${commonsName},
  'tokenPath': {commonsAbbreviation},
  'authUrl': `${commonsHost}/user/oauth2/authorize`,
  'arrangerUrl': `${commonsHost}/api/v0/flat-search`,
  'clientId': process.env.REACT_APP_CLIENT_ID_${commonsAbbreviation},
}
```

In addition to adding this to the `commonsList`, a logo will need to be added
to `/images` with the form `${commonsAbbreviation}-logo.png` and imported into `Homepage`.