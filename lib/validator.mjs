export function validateType(value, type, message) {
    if (type === 'object') {
        if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
        ) {
            throw new Error(message);
        }
    } else if (typeof value !== type) {
        throw new Error(message);
    }
}
