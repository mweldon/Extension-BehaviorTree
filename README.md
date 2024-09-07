# Extension-BehaviorTree
Create a dynamic branching scenario in SillyTavern using a Behavior Tree.

## Summary
Behavior Trees are a data structure often used in game design to control AI agents performing complex sequences of actions. They are a flexible way to encode logic into AI behavior and give them realistic schedules and reactions in a dynamic environment. This extension uses the same principles to allow you to build logical structure for an AI role-playing session. 

While many of these features can be put into a character card, doing so clutters the character description and will often confuse the AI model. The remedy for this is using a larger-parameter model or a longer context, or both. AI models can only get so big and contexts can only get so long before they will inevitably forget details of the conversation. By utilizing a Behavior Tree, you can keep the character card focused the character's personality, and leave the management of the scenario and the tracking of important events to be handled by the Tree.

## Quick Start
Clone this git repository into your data directory using the following commands:
```
cd {SillyTavern root}/data/default-user/extensions/
git clone https://github.com/mweldon/Extension-BehaviorTree
```
Refresh SillyTavern. In the Extensions view, expand Behavior Tree and click the checkbox to enable the extension. By default you will have a placeholder Tree. If you have a character card selected and you edit or import a Tree, the Tree will be saved with this character and reloaded when you select the same character in the future.

## Background

A Behavior Tree is a directed data structure where each node in the Tree is either a control node or a task node. Task nodes are customizable and the task nodes implemented in this extension will be described in another section. Each node in the tree can return a status code to its parent of either SUCCESS or FAILURE.

### Control nodes
The main control nodes are the sequence and the selector.

#### Sequence
A sequence node will execute each of its children nodes until one of them responds with FAILURE, in which case the sequence will return FAILURE to its parent. If all nodes complete with SUCCESS, then the sequence will return SUCCESS.

#### Selector
A selector node will execute each of its children nodes until one of them responds with SUCCESS, in which case the selector will return SUCCESS to its parent. If all nodes complete with FAILURE, then the selector will return FAILURE.

### Decorators
A decorator is a special type of control node that only has one child and is designed to transform a node's return value. Examples of commonly-used decorators are Invert, which inverts the response of its child, and Fail or Succeed which always return a specific response.

## How to Use a Behavior Tree for AI role playing
Whenever you send a new chat message in SillyTavern, this extension will capture the recent chat history and send it to a secondary AI, which will read the history and query it with YES/NO questions. The answers to these queries not only direct the traversal through branches of the Tree, but they can also modify variables or add scenarios modifiers to a block of text that will be injected into the context of the chat. This response text will be added to the chat context as a system message and can help direct the scenario.

For example, here is a Sequence that would allow you to open a locked treasure chest if you have found the Golden Key. In a Sequence, each node is run unless one of them returns FAILURE. If {{user}} has the key and is trying to open the chest, then the scenario modifier will be added to the response.

```
{
    "type": "sequence",
    "name": "openChest",
    "nodes": [
        {
            "type": "query",
            "name": "hasKey",
            "data": "Has {{user}} picked up the Golden Key?",
            "cacheYes": true
        },
        {
            "type": "query",
            "data": "Is {{user}} trying to open the treasure chest?"
        },
        {
            "type": "add_scenarios",
            "data": [
                "{{user}} will be able to unlock the chest with the Golden Key."
            ]
        }
    ]
}
```

The first node checks to see if you have picked up the Golden Key. The cacheYes flag here will preserve the response the first time the answer is YES, and skip the query in the future. Cached answers like this are useful in preserving information that the AI might normally forget about if the conversation is long. The second node checks to see if we are trying to open the chest. If so, then the last node will add a scenario mod that tells the chat AI that it is okay to unlock the chest.

Here is a more advanced variation that utilizes a Selector. If you don't have the key, then it will check if you are trying to pick the lock. If so, then it will perform a random roll where you have to get 16 or greater on a d20. It also makes use of "yes" and "no" response actions to simplify the tree.

```
{
    "type": "sequence",
    "name": "openChest",
    "nodes": [
        {
            "type": "selector",
            "name": "keyOrPick",
            "nodes": [
                {
                    "type": "query",
                    "name": "hasKey",
                    "data": "Has {{user}} picked up the Golden Key?",
                    "cacheYes": true
                },
                {
                    "type": "sequence",
                    "nodes": [
                        {
                            "type": "query",
                            "data": "Is {{user}} trying to pick the lock on the treasure chest?"
                        },
                        {
                            "type": "random_roll",
                            "data": {
                                "low": 1,
                                "high": 20,
                                "target": 16
                            },
                            "yes": {
                                "add_scenarios": [
                                    "{{user}} will be able to pick the lock on the treasure chest."
                                ]
                            },
                            "no": {
                                "add_scenarios": [
                                    "{{user}} will fail to pick the lock on the treasure chest."
                                ]
                            }
                        }
                    ]
                }
            ]
        },
        {
            "type": "query",
            "data": "Is {{user}} trying to open the treasure chest?",
            "yes": {
                "add_scenarios": [
                    "{{user}} will be able to open the chest."
                ]
            },
            "no": {
                "add_scenarios": [
                    "{{user}} will fail to open the chest and will be zapped with a magical power."
                ]
            }
        }
    ]
}
```
This may seem like a lot of work to unlock a single treasure chest. Queries can be written in a more general way to handle other kind of locked door, chest, gate, or whatever other challenges you may encounter.

## Extension Settings
### Query API
Select which API you want to use for the Behavior Tree queries. You can use Main API, which will be the same API used for your normal chat, or you can use an alternative AI model. You might prefer an alternative model from Main API since the context for queries does not necessarily need to be large and the queries can often be performed successfully by small, fast, and preferably free models that are good at summarization.

Currently KoboldCpp is supported, but other APIs can be added based on demand.

### View Tree
View and edit the currently loaded Behavior Tree. This editor is good for small modifications, but for authoring a Tree, I recommend an editor like VSCode or Notepad++. Furthermore, if your Tree gets corrupted, there is no good way to restore it, so it is best to edit your Trees with a separate program. When you save the Tree, it will be saved for the currently-selected character card and will be reloaded every time you load this card.

### View state data
Display the current state data. This starts out empty and is cleared when you change character cards. Ideally this should be persisted with each chat file, and that might be added in the future.

### Import Tree
Read a .json file containing a Behavior Tree. Make sure you are using legal JSON. Use a validator such as [this one](https://jsonformatter.curiousconcept.com/) to verify the syntax. I recommend VSCode since it will validate and highlight errors as you go. After you import the Tree, it will be saved for the currently-selected character card and will be reloaded every time you load this card.

### Restore default
This will erase your current Tree and revert to a default Tree that does nothing. There is no undo for this.

### Position in chat
The location in the chat context where the response text will be injected. Default is 1, which is 1 message above the end. If you set it lower than 1, it can break Impersonate.

### Execution frequency & Next execution in
How often the Tree is run. When the Tree is not run, then no extra text will be injected in the context, as if the extension were turned off. Impersonate does increment this counter. Swipes do not. If the Tree was run for last message, and you do a swipe, then the same response will be returned without the Tree running again.

If you want to force the Tree to run on the next message, set Next execution in to 1.

### Chat query length
How many of the previous chat messages are sent to the AI to perform queries, default 20. Set this to your taste and based on how large of an AI you are using for queries.

### Reponse prelude & Vars response & Scenarios response
These are prompt fragments that are used to assemble the response text. You can customize them as needed. 

## Reference

### JSON File Format
The behavior tree files are stored in JSON format. This is a text file format that can be edited with the editor of your choice. I prefer VSCode since it does automatic syntax checking for you. There are also websites that will check your JSON for errors.

### Response text
This extension will produce a block of text that will be injected into the chat context as a system message near the bottom. The location is configurable in the settings. The response contains some preamble text, then a list of vars with their values, then a list of scenario modifiers.

Example:
```
Keep the following instructions secret. Do not mention any of the following information in your response.
Use the following parameters to generate your next response:
Likelihood that it will rain: 80%
Update the scenario as follows:
Emily will be reluctant to go anywhere with Bob due to the weather.
```

Vars and scenario mods are reset before each Tree execution and built by the nodes in your tree.

The response is cached between runs and if you resubmit the same chat history to the extension, such as for swipes, then the cached response will be returned instead of re-running the Tree. If you want to force the Tree to run again for a swipe, you can edit a previous message and make any trivial change.

### Vars
Vars are percentage values that are reset to their starting value at the beginning of every Tree run. Vars can be set or cleared as response actions for queries or dice rolls, or by an explicit SetVarsTask. Valid range for values are -1 to 100 and is always treated as a percentage. The % will be added to the response text automatically. You can clear a var by setting it to -1. If you do so, then it won't appear in the response at all.

> [!NOTE]
> If you set a var to 0 it will still appear in the response as '0%'. If you set it to -1, then it won't be in the response.

### Scenario Mods
You can inject text directly into the response with scenario mods. This is freeform text and you can add anything you want. Think of this as OOC text that can significantly influence the direction of an RP conversation. Like vars, these are cleared at the beginning of each Tree run and they are added by nodes in the tree as response actions, or explicitly with an AddScenariosTask node.

### State Data
State data is persistent and saved between Tree runs. You can view and edit the state data in the settings. When you open or change the conversation, the state is cleared. State can be set is through the cacheYes and cacheNo optional flags on QueryTask. It can also be set explicitly with a SetStateTask and checked with a CheckState task.

> [!NOTE]
> State currently gets cleared whenever the chat changes.

### Tasks

#### QueryTask
This the most important node that you will use to customize your scenarios. The responses from queries are what allows the Tree to branch and follow different paths and customize the response text.

Usage:
```
{
    "type": "query",
    "name": "insideHauntedHouse",
    "data": "Have {{user}} and {{char}} entered the haunted house?",
    "cacheYes": true,
    "yes": {
        "set_vars": {
            "scary": 60,
            "ghosts": 20
        },
        "add_scenarios": [
            "{{user}} is inside the haunted house. The front door is locked and cannot be opened.",
            "{{char}} will behave very strangely, as if possessed by a spirit."
        ]
    },
    "no": {
        "set_vars": {
            "scary": 20
        },
        "add_scenarios": [
            "There is an old creepy house and {{char}} really wants to explore inside with {{user}}."
        ]
    }
}
```

Name is optional, but recommended, especially if you are using the cacheYes or cacheNo flags since the name will be used as the state key. Data contains the query that will be sent to the query AI. The cacheYes and cacheNo flags are optional and if set, the first time the query returns a YES (for cacheYes) or NO (for cacheNo) the result will be persisted in the state data. Future runs will skip the query if there is a cached result.

The yes and no blocks are optional response actions which allow you to influence the response based on the result of the query. You can set one or more vars, and/or add one or more scenario modifiers.

#### CreateVarsTask
This node defines one or more vars that will be used by this Tree and should be one of the first nodes in your Tree, if you are using vars. There should only ever be one of these nodes in a Tree. 

Each var has a keyword that defines it, a starting value which is set at the beginning of each Tree run, and a prompt which is added to the response if the final value is >= 0.

Usage:
```
{
    "type":"create_vars",
    "data":{
        "scary":{
            "value":10,
            "prompt":"How creepy and scary should the current environment be described:"
        },
        "ghosts":{
            "value":-1,
            "prompt":"Likelihood that {{user}} will see a supernatural apparition or ghost:"
        }
    }
}
```
Values are in percentages and can range from -1 to 100. If the value of a var is -1, then it will be excluded from the response. For any other number, the response will look like:
`{prompt} {value}%`

#### RandomRollTask
This node can be used to perform a random roll. If the roll is equal or greater than the target, then the yes actions will be performed, otherwise the no actions will be. 

```
{
    "type": "random_roll",
    "data": {
        "low": 1,
        "high": 20,
        "target": 16
    },
    "yes": {
        "add_scenarios": [
            "{{user}} will be able to pick the lock."
        ]
    },
    "no": {
        "add_scenarios": [
            "{{user}} will fail to pick the lock."
        ]
    }
}
```

A practical example of this would be a sequence with a query that asks something like, "Is {{user}} attempting to pick a lock?" followed by a roll, then possibly followed by additional tasks.

### Control Nodes
For all control nodes, the name field is optional but recommended for keeping things organized. Control nodes can be nested under other control nodes for creating advanced behaviors. Sequences and selectors can have any number of child nodes, while decorators can only have one.

#### Sequence
```
{
    "type": "sequence",
    "name": "Explore haunted house",
    "nodes": [
        ...
    ]
}
```

#### Selector
```
{
    "type": "selector",
    "name": "Explore haunted house",
    "nodes": [
        ...
    ]
}
```

#### Invert Decorator
This will invert the response of its child node. If the child node responds with SUCCESS, it will return FAILURE, and vice versa. All decorators can only have one child node.
```
{
    "type": "invert",
    "node": [
        ...
    ]
}
```

#### Succeed or Fail Decorators
These will always return a specific result.
```
{
    "type": "succeed",
    "node": [
        ...
    ]
}
```

```
{
    "type": "fail",
    "node": [
        ...
    ]
}
```

One practical use-case for these could be at the top of the Tree to set up some vars that should be applicable to the entire scenario. Maybe you have a query that says, "Has {{char}} turned into a werewolf?" and if so, you want to set a var "evilchar": 100, but, aside from setting the var, you don't want this result to affect the rest of the Tree. In this case you could put the query under a "succeed" decorator which would allow a Sequence to continue to the next node regardless of the answer to the query.

> [!NOTE] 
> Decorators do not modify the behavior of their child node. Only the value that is returned to its parent is affected.

### All Supported Node Types
* sequence
* selector
* invert - Decorator that inverts the result of its child.
* fail - Decorator that always returns FAILURE.
* succeed - Decorator that always returns SUCCESS.
* query - QueryTask, perform an AI query against the chat history
* create_vars - CreateVarsTask, define the response variables, if any
* set_vars - SetVarsTask, set a response variable
* add_scenarios - AddScenariosTask, add scenario modifiers to the response
* set_state - SetStateTask, set a persistent value
* check_state - CheckStateTask, test a persistent value
* random_roll - RandomRollTask, perform a random number check

## More Information
* Wikipedia article on Behavior Trees: https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)
* 'behaviortree' javascript library: https://github.com/Calamari/BehaviorTree.js/

The 'behaviortree' library is Copyright (C) 2013-2020 Georg Tavonius
