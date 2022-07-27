import { useState, useEffect } from "react";
import { ListGroup, ListGroupItem } from "react-bootstrap";
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "../common/Constants";

export default function ClusterInfo() {
    const [date, setDate] = useState(null);
    const [subscribers, setSubscribers] = useState([]);

    const getSubscribers = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscribers/list`)
            .then(response => {
                responseCode = response.status;
                return response.json();
            })
            .then(_subscribers => {
                if (responseCode === 200)
                    setSubscribers(_subscribers)
            })
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date());
        }
    }

    useEffect(() => {
        if (date == null) {
            getSubscribers();
        } else {
            let timeout = setTimeout(getSubscribers, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    return (
        <div>
            <ListGroup>
                <ListGroupItem className="subscriber-summary">
                    <h5>Name</h5>
                    <h5>Hostname</h5>
                    <h5>IP address</h5>
                    <h5>Memory usage</h5>
                    <h5>CPU usage</h5>
                </ListGroupItem>
                {Object.values(subscribers).map(x => (
                    <ListGroupItem className="subscriber-summary">
                        <abbr title="Subscriber name"><div className={ x.isMainNode ? "subscriber-bold" : "" }>{x.name}</div></abbr>
                        <abbr title="Hostname"><div>{x.hostname}</div></abbr>
                        <abbr title="IP address"><div>{x.ipAddress}</div></abbr>
                        <abbr title="Memory usage"><div>{Math.round((x.totalMemory - x.freeMemory) * (100 / x.totalMemory) * 100, -2) / 100}%</div></abbr>
                        <abbr title="CPU usage"><div>{Math.round(x.cpuUsage * 10000) / 100}%</div></abbr>
                    </ListGroupItem>
                ))}
            </ListGroup>
        </div>
    );
}