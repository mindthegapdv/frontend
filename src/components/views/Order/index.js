import React, { useState, useEffect } from 'react';
import * as moment from 'moment';
import { useRouter } from 'useRouter';
import { getFit, getServiceProviders, getOrder, updateOrder, generateToken } from 'api';
import { Spin, Button, Typography } from 'antd'
import { Table, Input, TimePicker, DatePicker } from "antd";
import { Select } from 'antd';
import { AddOrderGroup } from 'components/modals/AddOrderGroup';
import { AddOrderParticipant } from 'components/modals/AddOrderParticipant';
const { Option } = Select;
const { Title } = Typography;
const { TextArea } = Input;

const Section = ({ children, title, style }) => (
  <div>
    <span style={{ display: 'block', color: '#2D9CDB', fontSize: 15, marginBottom: 9 }}>{title}</span>
    <div style={{ padding: 24, backgroundColor: '#fff', borderRadius: 8, marginBottom: 24, ...(style || {}) }}>
      {children}
    </div>
  </div>
);

const LabelledInput = ({ children, label }) => (
  <div style={{ display: "inline-block", padding: 8 }}>
    <span style={{ display: 'block', paddingBottom: 2 }}>{label}</span>
    {children}
  </div>
)

const validStatus = ['Open To Join', 'Order Placed', 'Preparing', 'Ready To Eat', 'Feedback', 'Closed'];

export const Order = () => {
  const { match, history } = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [fit, setFit] = useState(0);

  const [serviceProvidersLoading, setServiceProvidersLoading] = useState(true);
  const [serviceProviders, setServiceProviders] = useState([]);

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  const openPreferences = (userId) => {
    generateToken(userId).then(token => {
      history.push(`/preferences?token=${token}`);
    })
  }

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (data, record) => {
        return (<><span style={{ display: 'block' }}>{data}</span><span>{record.dietaryRequirements || ''}</span></>)
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'right',
      render: (data) => {
        const value = {
          0: 'Unconfirmed',
          1: 'Confirmed',
          [-1]: 'Declined',
        }[data];

        const color = {
          1: '#18A268',
          0: '#A0A0A0',
          [-1]: '#A0A0A0',
        }[data];
        return (<span style={{ color, display: 'block', textAlign: 'right' }}>{value}</span>)
      }
    },
    {
      title: '',
      render: (data, record) => {
        return (<Button onClick={() => openPreferences(record.id)}>Open Preferences</Button>)
      }
    }
  ]

  useEffect(() => {
    getOrder(match.params.orderId).then(order => {
      setOrder(order);
      return getFit(order.id).then(fit => {
        setFit(fit);
        setLoading(false)
      }).catch(e => {
        setLoading(false);
      });
    })
    getServiceProviders().then(providers => {
      setServiceProviders(providers);
      setServiceProvidersLoading(false);
    })
  }, [match.params.orderId]);


  if (loading) {
    return <Spin />
  }

  const scheduledFor = moment(order.dt_scheduled);

  const updateLocation = (e) => {
    setOrder({ ...order, location: e.target.value });
  }

  const updateDate = (m) => {
    const dt_scheduled = m.toISOString().substr(0, 11) + scheduledFor.toISOString().substr(11, 25);
    setOrder({ ...order, dt_scheduled });
  }

  const updateTime = (m) => {
    const dt_scheduled = scheduledFor.toISOString().substr(0, 11) + m.toISOString().substr(11, 25);
    setOrder({ ...order, dt_scheduled });
  }

  const persistUpdates = () => {
    setLoading(true);
    const { id, ...rest } = order;
    const updates= Object.keys(rest).reduce((result, key) => {
      if (rest[key] && ['createdAt', 'updatedAt', 'stats', 'participants'].indexOf(key) === -1) {
        return { ...result, [key]: rest[key] };
      }
      return result;
    }, {});

    updateOrder(id, updates).then((newOrder) => {
      setOrder(newOrder);
      setLoading(false);
    })
  }
  const serviceProvider = serviceProviders.find(p => p.id === order.serviceProvider)
  const costPerPerson = serviceProvider && serviceProvider.costPerPerson
  const nextStatus = validStatus[validStatus.indexOf(order.status) + 1];
  const acceptedParticipants = order.participants.filter(p => p.status === 1);
  const totalOrders = Math.floor((acceptedParticipants.length * 1.2 * (1+fit)));
  const extraOrders = totalOrders - acceptedParticipants.length;
  const totalCost = totalOrders * costPerPerson;
  return (
    <div>
      <AddOrderGroup
        orderId={order.id}
        isVisible={showAddGroup}
        onCancel={() => setShowAddGroup(false)}
        onOk={() => window.location.reload() }
      />
      <AddOrderParticipant
        orderId={order.id}
        isVisible={showAddParticipant}
        onCancel={() => setShowAddParticipant(false)}
        onOk={() => window.location.reload() }
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: "space-between" }}>
        <div>
          <Title>{order.name || `Order ${order.id}`}</Title>
        </div>
        <div>
          <Button type="primary" size="large" style={{ marginBottom: 19, marginRight: 19 }} onClick={persistUpdates}>
            Save Order
          </Button>
          <Button type="secondary" size="large" style={{ marginBottom: 19 }} onClick={persistUpdates}>
            Move Order to {nextStatus}
          </Button>
        </div>
      </div>
      <Section title="When should the food arrive?">
        <LabelledInput label="Date">
          <DatePicker name="date" placeholder="Date" value={scheduledFor} onChange={updateDate}/>
        </LabelledInput>
        <LabelledInput label="Time">
          <TimePicker name="time" placeholder="Time" value={scheduledFor} onChange={updateTime}/>
        </LabelledInput>
        <LabelledInput label="Location">
          <Input name="location" placeholder="Location" value={order.location} onChange={updateLocation} />
        </LabelledInput>
      </Section>
      <Section title="Who’s eating?">
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 24 }}>
          <Button onClick={() => setShowAddGroup(true)} style={{ marginRight: 24 }}>
          Add Group
        </Button>
        <Button onClick={() => setShowAddParticipant(true)}>
          Add Individual Participant
        </Button>
      </div>
        <Table showHeader={true} dataSource={order.participants || []} columns={columns} pagination={false} />
      </Section>
      <Section title="Whats on the menu?">
        <TextArea value={order.menuDescription} rows={4} onChange={(e) => setOrder({ ...order, menuDescription: e.target.value })} />
      </Section>
      <Section title="Who might eat?" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '18px', color: '#444', display: 'block' }}>SmartPredict</span>
          <span>Recommendation based on your historical waste</span>
        </div>
        <div>
          You should order <Input style={{ display: 'inline', width: 100, margin: 10 }} value={extraOrders} disabled={true}/> extra meals for
          <Input style={{ display: 'inline', width: 100, margin: 10 }} value={acceptedParticipants.length} disabled={true}/> people
        </div>
      </Section>
      <Section title="Order from" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ display: 'block', color: '#444444', fontWeight: 'bold' }}>Service provider</span>
          <Select loading={serviceProvidersLoading} defaultValue={order.serviceProvider} style={{ width: '100%' }} onChange={(value) => setOrder({ ...order, serviceProvider: value })}>
            {serviceProviders.map(s => <Option value={s.id}>{s.name}</Option>)}
          </Select>
        </div>
        <div>
          <span style={{ display: 'block', color: '#444444', fontWeight: 'bold' }}>Estimated cost p.p.</span>
          <span style={{ fontSize: 18, color: '#444' }}>{ costPerPerson && `$${costPerPerson}pp` }</span>
        </div>
      </Section>
      <Section title="Ready to order?" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Select defaultValue={order.status} style={{ width: '100%' }} onChange={v => setOrder({ ...order, status: v })}>
            {validStatus.map(s => <Option value={s}>{s}</Option>)}
          </Select>
        </div>
        <div>
          <div>
            <span style={{ display: 'block', color: '#444444', fontWeight: 'bold' }}>Total Orders</span>
            <span style={{ fontSize: 18, color: '#444' }}>{ totalOrders && `${totalOrders}` }</span>
          </div>
          <div>
            <span style={{ display: 'block', color: '#444444', fontWeight: 'bold' }}>Estimated cost</span>
            <span style={{ fontSize: 18, color: '#444' }}>{ totalCost && `$${totalCost}` }</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
