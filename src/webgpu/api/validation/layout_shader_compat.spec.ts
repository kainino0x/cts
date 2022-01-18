export const description = `
TODO:
- x= {compute, vertex, fragment, vertex+fragment}, visibilities
- shader defines a superset, subset, or equal set of bindings
- binding variable types with all types of bindings
- storage buffer/texture access modes must match exactly
- required sizes of uniform and storage buffer bindings are computed correctly and validated
  against minBindingSize

See also pipeline_bind_group_compat for similar validation.
`;

import { makeTestGroup } from '../../../common/framework/test_group.js';

import { ValidationTest } from './validation_test.js';

export const g = makeTestGroup(ValidationTest);
