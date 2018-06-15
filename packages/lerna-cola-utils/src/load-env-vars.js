const path = require('path')
const fs = require('fs-extra')
const dotenv = require('dotenv')

module.exports = function loadEnvVars() {
  // First load anv env specific files
  const env = process.env.NODE_ENV || 'production'
  const envSpecificPath = path.resolve(process.cwd(), `./.env.${env}`)
  if (fs.existsSync(envSpecificPath)) {
    // eslint-disable-next-line no-console
    console.log(`Loading environment variables from ${envSpecificPath}`)
    dotenv.config({ path: envSpecificPath })
  }

  // Then load any generic .env "overides"
  const envPath = path.resolve(process.cwd(), './.env')
  if (fs.existsSync(envPath)) {
    // eslint-disable-next-line no-console
    console.log(`Loading environment variables from ${envPath}`)
    dotenv.config({ path: envPath })
  }
}
