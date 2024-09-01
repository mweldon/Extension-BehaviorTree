export function handleResponseActions(resultActions, blackboard) {
    if (resultActions) {
        if (resultActions.set_vars) {
            for (const [key, value] of Object.entries(resultActions.set_vars)) {
                blackboard.vars[key] = Math.max(Math.min(value, 100), -1);
            }
        }
        if (resultActions.set_state) {
            for (const [key, value] of Object.entries(resultActions.set_state)) {
                blackboard.state[key] = value;
            }
        }
        if (resultActions.add_scenarios) {
            blackboard.scenarios.push(...resultActions.add_scenarios)
        }
    }
}
