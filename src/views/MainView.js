import { useState, useEffect, useRef } from "react";
import { Form, ListGroup, ListGroupItem, Button, ToastContainer } from "react-bootstrap";
import { BsFillCircleFill, BsFillPlayCircleFill, BsFillPauseCircleFill, BsFillArrowUpRightCircleFill, BsFillTrashFill, BsCloudDownloadFill } from "react-icons/bs";
import dateFormat from "dateformat";
import { v4 as uuidv4 } from "uuid";
import 'bootstrap/dist/css/bootstrap.css';
import { Link } from "react-router-dom";
import { generateToast } from "../common/ToastUtils";
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "../common/Constants";

export default function MainView() {
    const [date, setDate] = useState(null);
    const [subscriptionList, setSubscriptionList] = useState([]);
    const [filter, setFilter] = useState('');
    const [showCopy, setShowCopy] = useState(false);
    const [showFileUploaded, setShowFileUploaded] = useState(false);
    const [showFileUploadError, setFileUploadError] = useState(false);
    const [fileUploadErrors, setFileUploadErrors] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [modifiedSubscriptions, setModifiedSubscriptions] = useState([]);
    const [failedSubscriptions, setFailedSubscriptions] = useState([]);
    const [showModifiedSubscriptions, setShowModifiedSubscriptions] = useState(false);
    const [showNotModifiedSubscriptions, setShowNotModifiedSubscriptions] = useState(false);
    const [showSubscriptionsStopped, setShowSubscriptionsStopped] = useState(false);
    const [showSubscriptionsNotStopped, setShowSubscriptionsNotStopped] = useState(false);
    const [stoppedSubscriptions, setStopedSubscriptions] = useState([]);
    const [notStoppedSubscriptions, setNotStoppedSubscriptions] = useState([]);
    const [showSubscriptionsStarted, setShowSubscriptionsStarted] = useState(false);
    const [showSubscriptionsNotStarted, setShowSubscriptionsNotStarted] = useState(false);
    const [startedSubscriptions, setStartedSubscriptions] = useState([]);
    const [notStartedSubscriptions, setNotStartedSubscriptions] = useState([]);
    const [showStopServiceError, setShowStopServiceError] = useState(false);
    const [showStartServiceError, setShowStartServiceError] = useState(false);
    const [deletedSubscription, setDeletedSubscription] = useState(null);
    const [showDeletedSubscription, setShowDeletedSubscription] = useState(false);
    const [showNotDeletedSubscription, setShowNotDeletedSubscription] = useState(false);
    const fileSelector = useRef(null);

    const getSubscriptions = () => {
        let responseCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/list`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(subscriptions => {
                if (responseCode === 200)
                    setSubscriptionList(subscriptions);
            })
            .finally(() => setDate(new Date()));
    }

    useEffect(() => {
        if (date === null) {
            getSubscriptions();
        } else {
            let timeout = setTimeout(getSubscriptions, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    const filterSubscriptionsByName = (subscriptions, filter) => {
        return filter === '' ? subscriptions : subscriptions.filter(x => x.name.toLowerCase().includes(filter.toLowerCase()));
    }

    const onFilterChange = (event) => {
        setFilter(event.target.value);
    }

    const onClickName = (name) => {
        navigator.clipboard.writeText(name)
        setShowCopy(true);
    }

    const uploadSubscriptions = () => {
        fileSelector.current.click();
    }

    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            let fileReader = new FileReader();

            fileReader.onload = () => resolve([file, fileReader.result]);

            fileReader.onerror = () => reject(fileReader);

            fileReader.readAsText(file);
        })
    }

    const fileOnChange = (event) => {
        let files = event.target.files;

        if (files.length === 0) {
            return;
        }

        let promises = [];

        for (let file of files) {
            promises.push(readFileAsText(file));
        }

        Promise.all(promises).then(values => {
            let errors = [];
            let success = [];
            let subscriptions = [];

            for (let value of values) {
                let filename = value[0].name;

                try {
                    let parsed = JSON.parse(value[1]);

                    if (Array.isArray(parsed)) {
                        subscriptions = subscriptions.concat(parsed.map(x => JSON.stringify(x)));
                    } else {
                        subscriptions.add(JSON.stringify(parsed));
                    }

                    success.push(filename);
                } catch(error) {
                    errors.push(`${filename}: ${error}`);
                }
            }

            setUploadedFiles(success);

            if (errors.length > 0) {
                setFileUploadErrors(errors);
                setFileUploadError(true);
            }

            if (success.length > 0) {
                setShowFileUploaded(true);
            }

            let resultCode = -1;

            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/upload`, {
                method: 'PUT',
                body: JSON.stringify({
                    subscriptions: subscriptions
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    resultCode = response.status;
                    return response.json();
                })
                .then(result => {
                    if (resultCode === 200) {
                        if (result.modified?.length > 0) {
                            setModifiedSubscriptions(result.modified);
                            setShowModifiedSubscriptions(true);
                        }

                        if (result.notModified?.length > 0) {
                            setFailedSubscriptions(result.notModified.map(x => JSON.parse(x).name));
                            setShowNotModifiedSubscriptions(true);
                        }
                        
                    } else {
                        setFailedSubscriptions("Error calling to data integration service");
                        setShowNotModifiedSubscriptions(true);
                    }

                    fileSelector.current.value = null;
                });
        })
    }

    const stopSubscriptions = (names) => {
        let fixedNames = names === null ? subscriptionList.map(x => x.name) : names;
        let responseCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/stop?subscriptions=${fixedNames.join()}`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(result => {
                if (responseCode === 200) {
                    if (result.result === "TOTAL") {
                        setStopedSubscriptions(fixedNames);
                        setShowSubscriptionsStopped(true);
                    }

                    if (result.modified?.length > 0) {
                        setStopedSubscriptions(result.modified);
                        setShowSubscriptionsStopped(true);
                    }

                    if (result.notModified?.length > 0) {
                        setNotStoppedSubscriptions(result.notModified);
                        setShowSubscriptionsNotStopped(true);
                    }
                } else {
                    setShowStopServiceError(true);
                }
            })
    }

    const startSubscriptions = (names) => {
        let fixedNames = names === null ? subscriptionList.map(x => x.name) : names;
        let responseCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/start?subscriptions=${fixedNames.join()}`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(result => {
                if (responseCode === 200) {
                    if (result.result === "TOTAL") {
                        setStopedSubscriptions(fixedNames);
                        setShowSubscriptionsStopped(true);
                    }

                    if (result.modified?.length > 0) {
                        setStartedSubscriptions(result.modified);
                        setShowSubscriptionsStarted(true);
                    }

                    if (result.notModified?.length > 0) {
                        setNotStartedSubscriptions(result.notModified);
                        setShowSubscriptionsNotStarted(true);
                    }
                } else {
                    setShowStartServiceError(true);
                }
            })
    }

    const downloadConfigurations = (names) => {
        let fixedNames = names === null ? subscriptionList.map(x => x.name) : names;
        let configurations = subscriptionList.filter(x => fixedNames.includes(x.name)).map(x => JSON.parse(x.content));

        if (configurations.length === 0)
            return;

        let element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(configurations, null, 2)));
        element.setAttribute('download', fixedNames.length === 1 ? `${fixedNames[0]}_${dateFormat(new Date(), "ddmmyyyyHHMMss")}.json` : `subscriptions_${dateFormat(new Date(), "ddmmyyyyHHMMss")}.json`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    const deleteSubscription = (name) => {
        let responseCode = -1;

        fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/delete?subscriptions=${name}`, {
            method: 'DELETE'
        }).then(response => {
            responseCode = response.status;
            return response.json();
        }).then(result => {
            if (responseCode === 200) {
                if (result.result === "TOTAL" || result.modified?.length > 0) {
                    setDeletedSubscription(name)
                    setShowDeletedSubscription(true);
                }

                if (result.notModified?.length > 0) {
                    setDeletedSubscription(name)
                    setShowNotDeletedSubscription(true);
                }
            }
        })
    }

    return (
        <div>
            <ListGroup>
                <ListGroupItem>
                    <Form onSubmit={e => e.preventDefault()}>
                        <Form.Control
                            type="text"
                            placeHolder="Type some text to filter subscriptions by name..."
                            onChange={onFilterChange} />
                    </Form>
                </ListGroupItem>
                <ListGroup>
                    <ListGroupItem className="subscriptions-main-buttons">
                        <input ref={fileSelector} type="file" className="subscriptions-input-none" multiple accept="application/json" onChange={fileOnChange} />
                        <Button variant="dark" className="reversed" onClick={uploadSubscriptions}>Upload subscriptions</Button>
                        <Button variant="dark" className="reversed" onClick={() => stopSubscriptions(null)}>Stop all</Button>
                        <Button variant="dark" className="reversed" onClick={() => startSubscriptions(null)}>Start all</Button>
                        <Button variant="dark" className="reversed" onClick={() => downloadConfigurations(null)}>Download all configurations</Button>
                    </ListGroupItem>
                </ListGroup>
                <ListGroupItem className="subscription-summary">
                    <h5>Status</h5>
                    <h5>Name</h5>
                    <h5>Creation date</h5>
                    <h5>Starts</h5>
                    <h5>Stops</h5>
                    <h5>Success</h5>
                    <h5>Failed</h5>
                    <h5></h5>
                </ListGroupItem>
                {filterSubscriptionsByName(subscriptionList, filter).map(x => (
                    <ListGroupItem key={uuidv4()} className="subscription-summary">
                        <abbr title={`Status: ${x.status}`}><BsFillCircleFill className={x.status === 'IDLE' ? 'icon-yellow' : x.status === 'RUNNING' ? 'icon-green' : 'icon-red'} /></abbr>
                        <abbr title={ `Name: ${x.name}` }><div className="subscription-info-name" onClick={() => onClickName(x.name)}>{x.name}</div></abbr>
                        <abbr title="Creation date"><div>{dateFormat(new Date(x.creation), "dd-mm-yyyy HH:MM:ss")}</div></abbr>
                        <abbr title="Starts"><div>{x.starts}</div></abbr>
                        <abbr title="Stops"><div>{x.stops}</div></abbr>
                        <abbr title="Success executions"><div>{x.success}</div></abbr>
                        <abbr title="Failed executions"><div>{x.error}</div></abbr>
                        <div className="subscription-summary-controls">
                            <Button className="reversed" variant="dark" onClick={() => x.status === 'STOPPED' ? startSubscriptions([x.name]) : stopSubscriptions([x.name])}>
                                {x.status === 'STOPPED' ? <abbr title="Start subscription"><BsFillPlayCircleFill /></abbr> : <abbr title="Pause subscription"><BsFillPauseCircleFill /></abbr>}
                            </Button>
                            <Link to={`/subscription?name=${x.name}`}>
                                <Button className="reversed" variant="dark">
                                    <abbr title="Show complete information"><BsFillArrowUpRightCircleFill /></abbr>
                                </Button>
                            </Link>
                            <Button className="reversed" variant="dark" onClick={() => downloadConfigurations([x.name])}>
                                <abbr title="Download file with subscription configuration"><BsCloudDownloadFill/></abbr>
                            </Button>
                            <Button className="reversed" variant="dark" onClick={() => deleteSubscription(x.name)}>
                                <abbr title="Delete subscription"><BsFillTrashFill /></abbr>
                            </Button>
                        </div>
                    </ListGroupItem>))}
            </ListGroup>
            <ToastContainer className="p-2 toast-container-fixed" position="bottom-end">
                { generateToast("SUCCESS", "", "Copied to clipboard!", showCopy, setShowCopy, 1500, 'success') }
                { generateToast("SUCCESS", "Files successfully uploaded", `${uploadedFiles}`, showFileUploaded, setShowFileUploaded, 5000, 'success') }
                { generateToast("ERROR", "Some files has errors", `${fileUploadErrors}`, showFileUploadError, setFileUploadError, 5000, 'danger') }
                { generateToast("SUCCESS", "Subscriptions uploaded", `${modifiedSubscriptions}`, showModifiedSubscriptions, setShowModifiedSubscriptions, 5000, 'success') }
                { generateToast("ERROR", "Subscriptions not uploaded", `${failedSubscriptions}`, showNotModifiedSubscriptions, setShowNotModifiedSubscriptions, 5000, 'danger') }
                { generateToast("SUCCESS", "Subscriptions successfully stopped", `${stoppedSubscriptions}`, showSubscriptionsStopped, setShowSubscriptionsStopped, 5000, 'success') }
                { generateToast("ERROR", "Subscriptions doesn't stopped", `${notStoppedSubscriptions}`, showSubscriptionsNotStopped, setShowSubscriptionsNotStopped, 5000, 'success') }
                { generateToast("SUCCESS", "Subscriptions successfully started", `${startedSubscriptions}`, showSubscriptionsStarted, setShowSubscriptionsStarted, 5000, 'success') }
                { generateToast("ERROR", "Subscriptions doesn't started", `${notStartedSubscriptions}`, showSubscriptionsNotStarted, setShowSubscriptionsNotStarted, 5000, 'danger') }
                { generateToast("ERROR", "Error during stop service invoking", "", showStopServiceError, setShowStopServiceError, 5000, 'danger') }
                { generateToast("ERROR", "Error during start service invoking", "", showStartServiceError, setShowStartServiceError, 5000, 'danger') }
                { generateToast("SUCCESS", "Subscription successfully deleted", `${deletedSubscription}`, showDeletedSubscription, setShowDeletedSubscription, 5000, 'success') }
                { generateToast("ERROR", "Subscription doesn't deleted", `${deleteSubscription}`, showNotDeletedSubscription, setShowNotDeletedSubscription, 5000, 'danger') }
                
            </ToastContainer>
        </div>
    );
}