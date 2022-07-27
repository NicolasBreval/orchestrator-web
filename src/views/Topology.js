import Graph from 'react-graph-vis';
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "../common/Constants";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import dateFormat from "dateformat";
import Editor from "@monaco-editor/react";

export default function Topology() {
    const [date, setDate] = useState(null);
    const [graph, setGraph] = useState({ nodes: [], edges: [] })
    const [selected, setSelected] = useState({});
    const [infoMap, setInfoMap] = useState(new Map());
    const events = {
        select: ({ nodes, edges }) => {
            setSelected(infoMap.get(nodes[0]));
        }
    };
    const options = { layout: { hierarchical: true }, edges: {}, height: '100%' };

    const mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

    const getGraph = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/list`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(subscriptions => {
                if (responseCode === 200) {
                    let id = 0

                    let nodeInfo = new Map();
                    let nodeMap = new Map();
                    let nodes = [];
                    let relations = []
                    let edges = [];

                    subscriptions.forEach(sub => {
                        let nId = ++id;
                        let label = sub.name;
                        let title = sub.description;
                        let color = sub.status === 'STOPPED' ? 'red' : sub.status === 'RUNNING' ? 'green' : 'yellow';
                        let receivers = JSON.parse(sub.content).receivers || [];

                        nodeInfo.set(nId, sub);
                        nodeMap.set(label, nId);
                        nodes.push({ id: nId, label: label, title: title, color: color, font: { bold: '10px arial black' } });
                        relations.push({ from: label, to: receivers.map(x => x.name) })
                    });

                    relations.forEach(relation => {
                        if (nodeMap.has(relation.from)) {
                            let fromId = nodeMap.get(relation.from);

                            relation.to.forEach(to => {
                                if (nodeMap.has(to)) {
                                    let toId = nodeMap.get(to);
                                    let color = mode === 'dark' ? 'white' : 'black'
                                    edges.push({ from: fromId, to: toId, color: color, width: 3 });
                                }
                            });
                        }
                    });

                    setInfoMap(nodeInfo);

                    setGraph({
                        nodes: nodes,
                        edges: edges
                    })
                }

            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date())
        }
    }


    useEffect(() => {
        if (date == null) {
            getGraph();
        } else {
            let timeout = setTimeout(getGraph, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    return (
        <div>
            <Graph
                key={uuidv4()}
                graph={graph}
                options={options}
                events={events}
                getNetwork={network => { }}
                style={{ height: '30vh' }}
            />
            <div className="graph-node-info">
                <div className='graph-node-info-sub'>
                    <div className='graph-node-info-header'>
                        <div>Status</div>
                        <div>Name</div>
                        <div>Creation date</div>
                        <div>Starts</div>
                        <div>Stops</div>
                        <div>Success</div>
                        <div>Failed</div>
                    </div>
                    <div className='graph-node-info-settings'>
                        <div>{selected?.status}</div>
                        <div>{selected?.name}</div>
                        <div>{selected?.creation ? dateFormat(new Date(selected.creation), "dd-mm-yyyy HH:MM:ss") : null}</div>
                        <div>{selected?.starts}</div>
                        <div>{selected?.stops}</div>
                        <div>{selected?.success}</div>
                        <div>{selected?.error}</div>
                    </div>
                </div>
                <Editor
                    language="json"
                    value={selected?.content ? JSON.stringify(JSON.parse(selected.content), null, 2) : ''}
                    className="creator-editor"
                    theme={mode === 'dark' ? 'vs-dark' : mode}
                    options={{
                        readOnly: true
                    }}
                />
            </div>
        </div>
    );
}