import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Button, Form, ListGroup, ListGroupItem, ToastContainer } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import dateFormat from "dateformat";
import { Buffer } from 'buffer';
import { generateJsonExampleFromSchema } from "../common/SchemaUtils";
import { generateToast } from "../common/ToastUtils";
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "../common/Constants";

export default function SubscriptionInfo() {
    const [date, setDate] = useState(null);
    const [subscriptionName, setSubscriptionName] = useState(null);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [logLines, setLogLines] = useState([]);
    const [leftContent, setLeftContent] = useState(null);
    const [rightContent, setRightContent] = useState(null);
    const [historical, setHistorical] = useState([]);
    const [selectedHistorical, setSelectedHistorical] = useState('');
    const [showCopy, setShowCopy] = useState(false);
    const [showSubscriptionUploaded, setShowSubscriptionUploaded] = useState(false);
    const [showSubscriptionNotUploaded, setShowSubscriptionNotUploaded] = useState(false);
    const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);
    const editorRef = useRef(DiffEditor);
    const mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" :"light";

    const getInfo = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscription/info?name=${subscriptionName}`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(info => {
                if (responseCode === 200)
                    setSubscriptionInfo(info);
            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date());
        }
    }

    const getLogs = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscription/logs?name=${subscriptionName}&count=${100}`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(logs => {
                if (responseCode === 200)
                    setLogLines(logs);
            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date())
        }
    }

    const getHistorical = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscription/historical?name=${subscriptionName}`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(_historical => {
                if (responseCode === 200) {
                    let sortedHistorical = _historical.sort((a, b) => a.id > b.id ? -1 : a.id < b.id ? 1 : 0)
                    setHistorical(sortedHistorical)

                    if (sortedHistorical.length > 0 && leftContent === null) {
                        setLeftContent(JSON.stringify(JSON.parse(new Buffer.from(sortedHistorical[0].content, 'base64').toString()), null, 2));
                    }

                    if (sortedHistorical.length > 0 && rightContent === null) {
                        setRightContent(JSON.stringify(JSON.parse(new Buffer.from(sortedHistorical[0].content, 'base64').toString()), null, 2));
                        setSelectedHistorical(sortedHistorical[0].id);
                    }
                }
            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date())
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        setSubscriptionName(params.get('name'));
    });

    useEffect(() => {
        if (date === null) {
            getInfo();
        } else {
            let timeout = setTimeout(getInfo, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date, subscriptionName]);

    useEffect(() => {
        if (date === null) {
            getLogs();
        } else {
            let timeout = setTimeout(getLogs, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date, subscriptionName]);

    useEffect(() => {
        if (date === null) {
            getHistorical();
        } else {
            let timeout = setTimeout(getHistorical, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date, subscriptionName]);

    const onSelectorChange = (event) => {
        setSelectedHistorical(event.target.value);
        let filtered = historical.filter(x => x.id.toString() === event.target.value);
        setLeftContent(JSON.stringify(JSON.parse(new Buffer.from(filtered[0].content, 'base64').toString()), null, 2));
    }

    const createLogLines = (lines) => {
        let variant = '';

        return lines.map(line => {
            if (line.includes('WARNING')) {
                variant = 'warning'
            } else if (line.includes('ERROR')) {
                variant = 'error'
            } else if (line.includes('INFO')) {
                variant = ''
            }

            return (
                <ListGroupItem variant={variant}>{line}</ListGroupItem>
            )
        })
    }

    const getHandlerRequestType = (request) => {
        if (request.type !== undefined) {
            let parsed = JSON.parse(request.type);

            return parsed.id === undefined ? parsed.type : parsed.id?.replace("urn:jsonschema:", "")?.replace(":", ".")
        }

        return ""
    }

    const getHandlerExample = (request) => {
        if (request.type !== undefined) {
            let parsed = JSON.parse(request.type);

            if (parsed.id !== undefined) {
                navigator.clipboard.writeText(JSON.stringify(generateJsonExampleFromSchema(parsed.id, request.type), null, 2));
                setShowCopy(true);
            }
        }
    }

    const uploadSubscription = () => {
        let leftLines = document.querySelector("div.editor.original > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines.monaco-mouse-cursor-text");
        let rightLines = document.querySelector("div.editor.modified > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines.monaco-mouse-cursor-text");
        
        let rightChildren = Array.from(rightLines.children).sort((a, b) => {
            let aTop = parseInt(a.style.top?.replace("px, "));
            let bTop = parseInt(b.style.top?.replace("px, "));
            return aTop - bTop;
        });

        let leftChildren = Array.from(leftLines.children).sort((a, b) => {
            let aTop = parseInt(a.style.top?.replace("px, "));
            let bTop = parseInt(b.style.top?.replace("px, "));
            return aTop - bTop;
        });

        let left = leftChildren.map(x => Array.from(x.children[0].children).map(x => x.innerText).join("")).join("\n");
        let right = rightChildren.map(x => Array.from(x.children[0].children).map(x => x.innerText).join("")).join("\n");

        if (left === right) {
            setShowSubscriptionWarning(true);
            return;
        }

        let resultCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/upload`, {
                method: 'PUT',
                body: JSON.stringify({
                    subscriptions: [right.replaceAll('\n', '').replaceAll('\xa0', ' ')]
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    resultCode = response.status;
                    return response.json();
                })
                .then(() => {
                    if (resultCode === 200) {
                        setShowSubscriptionUploaded(true);
                    } else {
                        setShowSubscriptionNotUploaded(true);
                    }
                });
    }

    const onContentChange = (newValue, e) => {
        setRightContent(newValue)
    }

    const downloadLogs = () => {
        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscription/logs/download?name=${subscriptionName}`)
            .then(response => response.blob())
            .then(blob => {
                let element = document.createElement('a');
                element.setAttribute('href', window.URL.createObjectURL(blob));
                element.setAttribute('download', `${subscriptionName}-logs.zip`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            })
    }

    return (
        <div className="subscription-container">
            <div className="subscription-title">
                <h2>{subscriptionName} [{subscriptionInfo?.status}]</h2>
            </div>
            <div>
                <ListGroup>
                    <ListGroupItem className="subscription-info">
                        <h5>Creation date</h5>
                        <h5>Input volume</h5>
                        <h5>Output volume</h5>
                        <h5>Starts</h5>
                        <h5>Stops</h5>
                        <h5>Success executions</h5>
                        <h5>Failed executions</h5>
                        <h5>Last execution</h5>
                    </ListGroupItem>
                    <ListGroupItem className="subscription-info">
                        <abbr title="Creation date"><div>{subscriptionInfo?.creation ? dateFormat(new Date(subscriptionInfo.creation), "dd-mm-yyyy HH:MM:ss") : null}</div></abbr>
                        <abbr title="Input volume"><div>{subscriptionInfo?.inputVolume}</div></abbr>
                        <abbr title="Output volume"><div>{subscriptionInfo?.outputVolume}</div></abbr>
                        <abbr title="Starts"><div>{subscriptionInfo?.starts}</div></abbr>
                        <abbr title="Stops"><div>{subscriptionInfo?.stops}</div></abbr>
                        <abbr title="Success"><div>{subscriptionInfo?.success}</div></abbr>
                        <abbr title="Error"><div>{subscriptionInfo?.error}</div></abbr>
                        <abbr title="Last execution"><div>{subscriptionInfo?.lastExecution ? subscriptionInfo.lastExecution === -1 ? "NEVER" : dateFormat(new Date(subscriptionInfo.lastExecution), "dd-mm-yyyy HH:MM:ss") : null}</div></abbr>
                    </ListGroupItem>
                </ListGroup>
            </div>
            <div className="subscription-title">
                <h3>Handlers</h3>
            </div>
            <div className="subscription-handlers">
                <ListGroup>
                    {subscriptionInfo === null || subscriptionInfo === undefined || subscriptionInfo.messageHandlers === undefined ? <div></div> : Object.entries(subscriptionInfo?.messageHandlers).map(entry =>
                        <ListGroupItem>
                            <div className="subscription-handler-description">
                                <h5>{entry[0]}: </h5><span>{entry[1]?.description}</span>
                            </div>
                            <ListGroup>
                                {(entry[1]?.requests || []).map(request =>
                                    <ListGroupItem className="subscription-handler-request">
                                        <span className="bold" onClick={() => getHandlerExample(request)}>{getHandlerRequestType(request)}</span>
                                        <span>{request.description}</span>
                                    </ListGroupItem>)}
                            </ListGroup>
                        </ListGroupItem>
                    )}
                </ListGroup>
            </div>
            <div className="subscription-log">
                <div className="subscription-title">
                    <h3>Logs</h3>
                    <Button variant='dark' className="subscription-log-button" onClick={downloadLogs}>
                        Download logs
                    </Button>
                </div>
                <ListGroup>
                    {createLogLines(logLines)}
                </ListGroup>
            </div>
            <div className="subscription-historical">
                <div className="subscription-title">
                    <h3>Historical</h3>
                </div>
                <div className="subscription-selector">
                    <Form.Select onChange={onSelectorChange}>
                        {historical.reverse().map(x => <option key={uuidv4()} selected={x.id?.toString() === selectedHistorical}>{x.id}</option>)}
                    </Form.Select>
                    <Button variant='dark' onClick={uploadSubscription}>Update</Button>
                </div>
                <div className="subscription-historical-content">
                    <DiffEditor
                        ref={editorRef}
                        theme={mode === 'dark' ? "vs-dark" : mode}
                        language="json"
                        original={leftContent}
                        modified={rightContent}
                        height="500px"
                        onChange={onContentChange}
                    />
                </div>
            </div>
            <ToastContainer className="p-2 toast-container-fixed" position="bottom-end">
                {generateToast("SUCCESS", "", "Copied to clipboard!", showCopy, setShowCopy, 1500, 'success')}
                {generateToast("SUCCESS", "", "Subscription uploaded!", showSubscriptionUploaded, setShowSubscriptionUploaded, 5000, 'success')}
                {generateToast("ERROR", "", "Subscription not uploaded!", showSubscriptionNotUploaded, setShowSubscriptionNotUploaded, 5000, 'error')}
                {generateToast("WARNING", "", "Content is not different, subscription not uploaded!", showSubscriptionWarning, setShowSubscriptionWarning, 5000, 'warning')}
            </ToastContainer>
        </div>
    );
}