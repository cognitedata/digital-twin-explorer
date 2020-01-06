import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button } from 'antd';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import { CogniteEvent } from '@cognite/sdk';
import { EventPreview } from '@cognite/gearbox';
import LoadingWrapper from 'components/LoadingWrapper';
import { ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import ViewingDetailsNavBar from './ViewingDetailsNavBar';
import {
  selectEvents,
  fetchEventsForAssetId,
  selectEventsByAssetId,
} from '../../modules/events';

const Wrapper = styled.div`
  height: 100%;
  padding: 24px 56px;
  display: flex;
  flex-direction: column;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

type OrigProps = {
  asset: ExtendedAsset;
  eventId?: number;
  onSelect: (id: number) => void;
  onClearSelection: () => void;
  onViewDetails: (type: string, id: number) => void;
};

type Props = {
  events: CogniteEvent[] | undefined;
  selectedEvent: CogniteEvent | undefined;
  push: typeof push;
  fetchEventsForAssetId: typeof fetchEventsForAssetId;
} & OrigProps;

type State = {};

class AssetTimeseriesSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.props.fetchEventsForAssetId(this.props.asset.id);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset.id !== prevProps.asset.id) {
      this.props.fetchEventsForAssetId(this.props.asset.id);
    }
  }

  get columns(): ColumnProps<CogniteEvent>[] {
    return [
      {
        title: 'Type',
        key: 'type',
        dataIndex: 'type',
      },
      {
        title: 'Subtype',
        key: 'subtype',
        dataIndex: 'subtype',
      },
      {
        title: 'Description',
        key: 'description',
        dataIndex: 'description',
      },
      {
        title: 'Start Time',
        key: 'description',
        dataIndex: 'startTime',
      },
      {
        title: 'Start Time',
        key: 'description',
        dataIndex: 'endTime',
      },
      {
        title: 'Last Modified',
        key: 'last-modified',
        render: (item: CogniteEvent) => {
          return moment(item.lastUpdatedTime).format('YYYY-MM-DD hh:mm');
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: item => {
          return (
            <>
              <Button
                onClick={() => this.onUnlinkClicked(item.id)}
                ghost
                type="danger"
              >
                Unlink
              </Button>
            </>
          );
        },
      },
    ];
  }

  onUnlinkClicked = (fileId: number) => {
    console.log(fileId);
  };

  renderItem = () => {
    const { selectedEvent, eventId } = this.props;
    if (eventId && selectedEvent) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectedEvent.type || 'Event'}
            description={selectedEvent.description || ''}
            onButtonClicked={() => this.props.onViewDetails('event', eventId)}
            onBackClicked={this.props.onClearSelection}
          />
          <div
            style={{
              marginTop: '24px',
            }}
          >
            <EventPreview eventId={eventId} />
          </div>
        </>
      );
    }
    return (
      <>
        <ViewingDetailsNavBar
          name="Event"
          description="Loading..."
          onButtonClicked={() => {}}
          onBackClicked={this.props.onClearSelection}
        />
        <LoadingWrapper>Loading Event</LoadingWrapper>
      </>
    );
  };

  render() {
    const { events, eventId } = this.props;
    if (eventId) {
      return this.renderItem();
    }
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <p />
          </div>
          <div className="right">
            <Button icon="plus" type="primary">
              Create New Event
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={events}
            columns={this.columns}
            scroll={{ y: true }}
            pagination={{
              position: 'bottom',
              showQuickJumper: true,
              showSizeChanger: true,
            }}
            onRow={(row: CogniteEvent) => ({
              onClick: () => {
                this.props.onSelect(row.id);
              },
            })}
            loading={!events}
          />
        </FlexTableWrapper>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    events: selectEventsByAssetId(state, origProps.asset.id),
    selectedEvent: origProps.eventId
      ? selectEvents(state).items[origProps.eventId]
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchEventsForAssetId }, dispatch);
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetTimeseriesSection);
