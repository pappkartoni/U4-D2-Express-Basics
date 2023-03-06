export const badRequestHandler = (err, req, res, next) => {
    if (err.status === 400) {
      res.status(400).send({ success: false, message: err.message, errorsList: err.errorsList ? err.errorsList.map(e => e.msg) : []})
    } else {
      next(err)
    }
  }
  
  export const unauthorizedHandler = (err, req, res, next) => {
    if (err.status === 401) {
      res.status(401).send({ success: false, message: err.message })
    } else {
      next(err)
    }
  }
  
  export const notfoundHandler = (err, req, res, next) => {
    if (err.status === 404) {
      res.status(404).send({ success: false, message: err.message })
    } else {
      next(err)
    }
  }
  
  export const genericErrorHandler = (err, req, res, next) => {
    res.status(500).send({ success: false, message: "We done fucked up" })
    console.log(err)
  }