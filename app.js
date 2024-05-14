const express = require('express')

const app = express()
app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const bcrypt = require('express')
const jwt = require('jsonwebtoken')
const path = require('path')

const dbPath = path.join(__dirname, 'covid19indiaPortal.db')
let db = null

const intilization = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Runing At http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DATABASE Error ${error.message}`)
    process.exit(1)
  }
}

intilization()

const convetStateObjectInToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictObjectInToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

const authentication = (request, response, next) => {
  let jwtToken
  const authToken = request.headers['authentication']
  if (authToken !== undefined) {
    jwtToken = authToken.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userQuery = `select * from user where username = '${username}'`
  const dbUser = await db.get(userQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const checkingpasscode = await bcrypt.compare(password, dbUser.password)
    if (checkingpasscode === true) {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/states/', authentication, async (request, response) => {
  const stateQuerys = `
  select
  state_id AS stateId,
  state_name AS stateName,
  population AS population
  from
  state
  `
  const stateArray = db.all(stateQuerys)
  response.send(stateArray)
})

app.get('/states/', authentication, async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
  select
  state_id AS stateId,
  state_name AS stateName,
  population AS population
  from
  state
  where
  state_id = '${stateId}'
  `
  const getstateQuery = await db.get(stateQuery)
  response.send(getstateQuery)
})

app.post('/districts/', authentication, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const insertQuery = `
  INSERT INTO
  district(district_name,state_id,cases,cured,active,deaths)
  values('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}')
  `
  await db.run(insertQuery)
  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const districtQuery = `
  select
  district_id as districtId,
  district_name as districtName,
  state_id as stateId,
  cases as cases,
  cured as cured,
  active as active,
  deaths as deaths
  where
  district_id = '${districtId}'
  `
    const getdistrictQuery = await db.get(districtQuery)
    response.send(getdistrictQuery)
  },
)

app.delete(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const deletedistrict = `
    delete
    from 
    district
    where
    district_id = '${districtId}'
    `
    await db.run(deletedistrict)
    response.send('District Remov')
  },
)

app.put(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateQuery = `
    update
    district
    set
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    where
    district_id = '${districtId}'
    `
    await db.run(updateQuery)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authentication,
  async (request, response) => {
    const {stateId} = request.params
    const sumofAllQuery = `
  select
  sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths
  from
  district
  where
  state_id = '${stateId}'
  `
    const total = await db.run(sumofAllQuery)
    respone.send(total)
  },
)

module.exports = app
