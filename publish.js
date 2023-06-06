const fs = require('fs');

function parsePackage() {
  const data = fs.readFileSync('./package.json',
                               {encoding:'utf8', flag:'r'});
  return JSON.parse(data)
}

function parseMenu() {
  const data = fs.readFileSync('./docs/navigationModel.json',
                               {encoding:'utf8', flag:'r'});
  const parsedMenu = JSON.parse(data)
  const sections = {}
  parsedMenu.forEach(entry => {
    entry.subMenu.forEach(subMenu => {
      const label = subMenu.label
      if (typeof subMenu['subMenu'] !== 'undefined') {
        subMenu['subMenu'].forEach(subMenuFunction => {
          sections[subMenuFunction['id']] = label
        })
      }
    })
  })
  return sections
}

const menu = parseMenu()

function findSectionForFunction(funcName) {
}

/**
 * Publish hook for the JSDoc template.  Writes to JSON stdout.
 * @param {function} data The root of the Taffy DB containing doclet records.
 * @param {Object} opts Options.
 */
exports.publish = function(data, opts) {
  const docs = data().get().filter(function(doc) {
    return !doc.undocumented;
  });
  const classes = data({kind: "class"}).get()
  const functions = data({kind: "function"}).get().filter(x => !x.undocumented)
  const outputClasses = classes.map(class_ => {
    const classFunctions = functions.filter(x => x.memberof === class_.name)
    const functionOutput = classFunctions.map(func => {
      let params = []
      if (typeof func.params !== 'undefined') {
        params = func.params.map(param => {
          return {
            '@type': 'Parameter',
            name: param.name,
            type: param.type ? param.type.names.join("|") : 'unknown',
            summary: param.description
          }
      })
      }
      return {
        '@type': 'Definition',
        name: func.name,
        summary: func.description,
        section: (typeof menu[func.name] !== 'undefined' ? menu[func.name] : null),
        parameters: params,
        returns: (typeof func.returns !== 'undefined' ? func.returns.map(returns => {
          let type = "void"
          if (typeof returns.type !== 'undefined') {
            type = returns.type.names.filter(x => x != null).join("|")
          }
          return {'@type': 'Returns', name: '', summary: returns.description, type }
        })[0] : {'@type': 'Returns', name: '', type: 'void' })
      }
    })
    return {
      '@type': 'Class',
      name: class_.name,
      summary: class_.description,
      memberFunctions: functionOutput,
    }
  })
  const package = parsePackage()
  const application = {
    '@type': 'Application',
    language: "Javascript",
    version: package['version'],
    license: package['license'],
    name: package['name'],
    summary: package['description'],
    modules: [
      {'@type': 'Module', name: "lib", classes: outputClasses}
    ],
  }
  console.log(JSON.stringify(application, null, 2))
};
