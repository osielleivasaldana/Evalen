import { ValidateBy, ValidationOptions } from 'class-validator';

/**
 * Validador personalizado para enums que evita problemas de resolución
 * cuando @IsEnum recibe undefined/null durante la inicialización de decoradores
 */
export function IsEnumValue(
  enumObject: Record<string, any> | readonly string[],
  validationOptions?: ValidationOptions
) {
  return ValidateBy(
    {
      name: 'isEnumValue',
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) {
            // Si el campo es opcional, permitir undefined/null
            return true;
          }

          // Manejar tanto objetos enum como arrays de valores
          const validValues = Array.isArray(enumObject)
            ? enumObject
            : Object.values(enumObject);

          return validValues.includes(value);
        },
        defaultMessage() {
          const validValues = Array.isArray(enumObject)
            ? enumObject
            : Object.values(enumObject);
          return `Value must be one of: ${validValues.join(', ')}`;
        },
      },
    },
    validationOptions,
  );
}
