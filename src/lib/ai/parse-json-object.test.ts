import { parseJsonObject } from './parse-json-object';

describe('parseJsonObject', () => {
  it('reads the object in a reply', () => {
    expect(parseJsonObject('{"actions":[]}')).toEqual({ actions: [] });
    expect(parseJsonObject('```json\n{"actions": [{"do": "list_tasks"}]}\n```')).toEqual({
      actions: [{ do: 'list_tasks' }],
    });
  });

  it('stops at the end of the first object, so text the model writes after it is left out', () => {
    expect(
      parseJsonObject(
        '{"actions":[{"do":"add_task","title":"buy eggs"}]} Don\'t let me forget to call Ana {"actions":[]}',
      ),
    ).toEqual({ actions: [{ do: 'add_task', title: 'buy eggs' }] });
  });

  it('skips braces inside strings', () => {
    expect(parseJsonObject('{"text":"a } and a {"} more')).toEqual({ text: 'a } and a {' });
  });

  it.each(['no object here', '{"actions": [', '{"actions":[{"do":"x"}]]}', ''])(
    'returns undefined for %p',
    (text) => {
      expect(parseJsonObject(text)).toBeUndefined();
    },
  );
});
