const aux = require('./auxiliary')
const nunjucks = require('nunjucks')

const VARIABLE_START_TAG = '<============================='
const VARIABLE_END_TAG =   '=============================>'

const TEMPLATE_TAGS = {
  blockStart: `${VARIABLE_START_TAG}-`,
  blockEnd: `-${VARIABLE_END_TAG}`,
  variableStart: VARIABLE_START_TAG,
  variableEnd: VARIABLE_END_TAG,
  commentStart: `${VARIABLE_START_TAG}#`,
  commentEnd: `#${VARIABLE_END_TAG}`,
}

/**
 * Parses a given templateSource string into a template renderTemplateing
 * function.
 * 
 * @param  {String} templateSource
 * @param  {Array[String]} queries
 * @return {Function}
 */
const parseTemplate = (templateSource, queries) => {
	if (typeof templateSource !== 'string') {
		throw new Error('templateSource must be a String')
	}

	if (!queries) {
		throw new Error('queries is required')
	}
	queries = Array.isArray(queries) ? queries : [queries]

	/**
	 * Specification of the data tokens
	 */
	let dataTokens = queries.map(query => {
		query = aux.expandStr(query)

		/**
		 * Used uuid.v4 as variable names to minimize chances
		 * of naming conflicts or recursive substitutions
		 * in the template string.
		 *
		 * Normal code does not contain uuid.v4-like variables.
		 */
		return {
			id: aux.randomVariableName(),
			name: query.source,
			query: query,
		}
	})

	/**
	 * Object that maps token names to their
	 * ids (interpreted as actual variables inside the template)
	 */
	let dataMap = dataTokens.reduce((res, token) => {
		res[token.id] = token.name

		return res
	}, {})

	/**
	 * Generate a template string using ES6 string literal syntax
	 * given the parseTemplated tokens
	 */
	let templateStr = dataTokens.reduce((res, token) => {
		token.query.formats.forEach(tokenQueryFormat => {
			let tokenQueryFormatRe = new RegExp(tokenQueryFormat.value, 'g')
			let tokenVariableStr = `${token.id}.${tokenQueryFormat.name}`

			res = res.replace(
				tokenQueryFormatRe,
				VARIABLE_START_TAG + tokenVariableStr + VARIABLE_END_TAG
			)
		})

		return res

	}, templateSource)

	let renderTemplate = function (data) {
		// map the passed in data to the
		// random variable names
		data = aux.transposeObj(dataMap, data)

		// expand the values of the object
		// into all format variations
		data = aux.expandObj(data)

		const rendererEnv = new nunjucks.Environment(null, {
		  tags: TEMPLATE_TAGS
		})

		return rendererEnv.renderString(templateStr, data)
	}

	return renderTemplate
}

/**
 * Shorthand for parsing and rendering the template
 * @param  {String} templateSource
 * @param  {Object} data
 * @return {String}
 */
const renderTemplate = (templateSource, data) => {
	let queries = Object.keys(data)

	return parseTemplate(templateSource, queries)(data)
}

module.exports = {
	parseTemplate,
	renderTemplate
}
