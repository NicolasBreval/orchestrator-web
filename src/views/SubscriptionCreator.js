import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Form, ListGroup, ListGroupItem, Button, ToastContainer } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import { generateToast } from "../common/ToastUtils";
import { generateJsonExampleFromSchema } from "../common/SchemaUtils";
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "../common/Constants";

export default function SubscriptionCreator() {
    const [date, setDate] = useState(null);
    const [schemas, setSchemas] = useState([]);
    const [schemaContent, setSchemaContent] = useState(null);
    const [selectedSchema, setSelectedSchema] = useState(null);
    const [showCopy, setShowCopy] = useState(false);
    const [showUploaded, setShowUploaded] = useState(false);
    const [showNotUploaded, setShowNotUploaded] = useState(false);
    const mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

    const getSchemas = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/schemas`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(_schemas => {
                if (responseCode === 200) {
                    setSchemas(Object.entries(_schemas).map(x => generateJsonExampleFromSchema(x[0], x[1])).sort((a, b) => a.className > b.className ? 1 : a.className < b.className ? -1 : 0));

                    if (selectedSchema === null && schemas.length > 0) {
                        setSelectedSchema(schemas[0].className);
                        setSchemaContent(JSON.stringify(schemas[0], null, 2));
                    }
                }
            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date())
        }
    }

    useEffect(() => {
        if (date === null) {
            getSchemas()
        } else {
            let timeout = setTimeout(getSchemas, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    const handleSchemaChange = (event) => {
        setSelectedSchema(event.target.value);
        setSchemaContent(JSON.stringify(schemas.filter(x => x.className === event.target.value)[0], null, 2));
    }

    const onSchemaCopy = () => {
        navigator.clipboard.writeText(schemaContent);
        setShowCopy(true);
    }

    const uploadSubscription = () => {
        let resultCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/upload`, {
                method: 'PUT',
                body: JSON.stringify({
                    subscriptions: [schemaContent]
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    resultCode = response.status;
                    return response.json();
                })
                .then(response => {
                    if (resultCode === 200) {
                        if (response.notModified !== undefined && response.notModified.length > 0) {
                            setShowNotUploaded(true);
                        } else {
                            setShowUploaded(true);
                        }
                    } else {
                        setShowNotUploaded(true);
                    }
                });
    }

    const onEditorChange = (newValue, e) => {
        setSchemaContent(newValue);
    }

    return (
        <div>
            <ListGroup>
                <ListGroupItem className="creator-selector">
                    <Form.Select onChange={handleSchemaChange}>
                        {schemas.map(x => <option key={uuidv4()} selected={x.className === selectedSchema}>{x.className}</option>)}
                    </Form.Select>
                    <div className="creator-buttons">
                        <Button variant="dark" className="reversed" type="submit" onClick={onSchemaCopy}>
                            Copy schema
                        </Button>
                        <Button variant="dark" className="reversed" type="submit" onClick={uploadSubscription}>
                            Upload subscription
                        </Button>
                    </div>
                </ListGroupItem>
                <ListGroupItem className="listgroup-item-body-bg">
                    <Editor
                        language="json"
                        value={schemaContent}
                        className="creator-editor"
                        onChange={onEditorChange}
                        theme={mode === 'dark' ? 'vs-dark' : mode}
                    />
                </ListGroupItem>
            </ListGroup>
            <ToastContainer className="p-2" position="bottom-end">
                {generateToast("SUCCESS", "", "Copied to clipboard!", showCopy, setShowCopy, 1500, 'success')}
                {generateToast("SUCCESS", "", "Subscription uploaded", showUploaded, setShowUploaded, 5000, 'success')}
                {generateToast("ERROR", "", "Subscription not uploaded", showNotUploaded, setShowNotUploaded, 5000, 'error')}
            </ToastContainer>
        </div>
    );
}