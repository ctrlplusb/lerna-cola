// https://github.com/webpack/docs/wiki/How-to-write-a-plugin
// https://webpack.github.io/docs/api-in-modules.html

function InjectHMRCodeForEntryModulePlugin(options) {
  if (!options.entryFile) {
    throw new Error('You must provide an entry file')
  }
  this.options = options
}

InjectHMRCodeForEntryModulePlugin.prototype.apply = function apply(compiler) {
  const options = this.options

  /* eslint-disable */
  compiler.plugin('after-plugins', function() {
    compiler.plugin('this-compilation', function(compilation) {
      compilation.moduleTemplate.plugin('render', function(
        moduleSourcePostModule,
        module,
        chunk,
        dependencyTemplates,
      ) {
        if (module.resource === options.entryFile) {
          return this.asString([
            moduleSourcePostModule.source(),
            `
              if (module.hot) {
                console.log('lerna-cola has injected webpack HMR code')
                module.hot.accept(function(err) {
                  if (err) {
                    console.error("Cannot apply hot update", err);
                  }
                });
              }
            `,
          ])
        }
        return moduleSourcePostModule
      })
    })
  })
  /* eslint-enable */
}

module.exports = InjectHMRCodeForEntryModulePlugin
