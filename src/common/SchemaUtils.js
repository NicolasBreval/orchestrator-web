
export const generateJsonExampleFromSchema = (name, schema) => {
    var result = {};
    schemaInterpreter(JSON.parse(schema), result, null);
    result["className"] = name;
    return result;
}

const schemaInterpreter = (schema, result, propertyName) => {
    try {
        if (schema.type === 'object') {
            if (schema.properties) {
                for (let property of Object.entries(schema.properties)) {
                    schemaInterpreter(property[1], result, property[0])
                }
            }
        } else if (schema.type === 'array') {
            result[`${propertyName}`] = []

            let obj = {}
            schemaInterpreter(schema.items, obj, null)
            result[propertyName].push(obj)

        } else if (schema.type === 'string') {
            result[propertyName] = ""
        } else if (schema.type === 'number') {
            result[propertyName] = 0
        } else if (schema.type === 'boolean') {
            result[propertyName] = false
        } else {
            result[propertyName] = null
        }
    } catch (error) {
        console.log();
    }
}