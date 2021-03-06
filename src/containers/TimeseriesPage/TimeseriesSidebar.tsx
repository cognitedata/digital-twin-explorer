import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, Tabs, Descriptions, List } from 'antd';
import moment from 'moment';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import AddOrEditTimeseriesModal from 'containers/Modals/AddOrEditTimeseriesModal';
import { AssetIcon } from 'assets';
import { sdk } from 'utils/SDK';
import { RootState } from '../../reducers/index';
import { addTimeseriesToState } from '../../modules/timeseries';
import { canEditTimeseries } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';
import {
  selectAssetById,
  ExtendedAsset,
  fetchAsset,
} from '../../modules/assets';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 360px;
  padding: 16px;
  border-right: 1px solid #d9d9d9;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }

  .ant-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content {
    flex: 1;
    position: relative;
    height: 0;
  }

  .ant-tabs-tabpane {
    overflow: auto;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  margin-bottom: 20px;
  margin-top: 24px;

  && > * {
    margin-left: 16px;
  }
  && > *:nth-child(1) {
    margin-left: 0px;
  }
`;

type OrigProps = {
  timeseries: GetTimeSeriesMetadataDTO;
  onGoToAssetClicked: (id: number) => void;
  onDeleteClicked: () => void;
};

type Props = {
  push: typeof push;
  fetchAsset: typeof fetchAsset;
  addTimeseriesToState: typeof addTimeseriesToState;
  asset: ExtendedAsset | undefined;
} & OrigProps;

type State = { showEditModal: boolean };

class TimeseriesSidebar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showEditModal: false };
  }

  componentDidMount() {
    if (this.props.timeseries.assetId && !this.props.asset) {
      this.props.fetchAsset(this.props.timeseries.assetId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.timeseries.assetId !== this.props.timeseries.assetId &&
      this.props.timeseries.assetId &&
      !this.props.asset
    ) {
      this.props.fetchAsset(this.props.timeseries.assetId);
    }
  }

  onUnlickClicked = async () => {
    trackUsage('TimeseriesPage.TimeseriesSidebar.Unlink', {
      id: this.props.timeseries.id,
    });
    if (!canEditTimeseries()) {
      return;
    }
    const timeseries = await sdk.timeseries.update([
      { id: this.props.timeseries.id, update: { assetId: { setNull: true } } },
    ]);

    this.props.addTimeseriesToState(timeseries);
  };

  render() {
    const { timeseries } = this.props;
    const { showEditModal } = this.state;
    return (
      <Wrapper>
        <h1>{timeseries.name}</h1>
        <ButtonRow>
          <Button
            type="primary"
            shape="round"
            onClick={() => this.setState({ showEditModal: true })}
          >
            Edit
          </Button>
          <Button
            type="danger"
            shape="circle"
            icon="delete"
            onClick={this.props.onDeleteClicked}
          />
        </ButtonRow>
        <Tabs size="small" tabBarGutter={6}>
          <Tabs.TabPane tab="Details" key="details">
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Description">
                {timeseries.description}
              </Descriptions.Item>
              <Descriptions.Item label="External ID">
                {timeseries.externalId}
              </Descriptions.Item>
              <Descriptions.Item label="ID">{timeseries.id}</Descriptions.Item>
              <Descriptions.Item label="Unit">
                {timeseries.unit}
              </Descriptions.Item>
              <Descriptions.Item label="Is Step">
                {timeseries.isStep ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="Is String">
                {timeseries.isString ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="Created Time">
                {moment(timeseries.createdTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Last Modified">
                {moment(timeseries.lastUpdatedTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Linked Assets" key="assets">
            <>
              <Button
                onClick={() => this.setState({ showEditModal: true })}
                disabled={!canEditTimeseries(false)}
              >
                Link an asset
              </Button>
              <List
                dataSource={
                  timeseries.assetId
                    ? [
                        {
                          name: this.props.asset
                            ? this.props.asset.name
                            : 'Loading...',
                          id: timeseries.assetId,
                        },
                      ]
                    : []
                }
                loading={!!timeseries.assetId && !this.props.asset}
                rowKey={item => (item ? `${item.id}` : 'asset')}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        ghost
                        type="danger"
                        onClick={e => {
                          e.stopPropagation();
                          this.onUnlickClicked();
                        }}
                        disabled={!canEditTimeseries(false)}
                      >
                        Unlink
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Button
                          type="link"
                          icon="control"
                          onClick={() => this.props.onGoToAssetClicked(item.id)}
                        >
                          <img
                            src={AssetIcon}
                            alt=""
                            style={{ marginRight: '4px' }}
                          />
                          {item.name}
                        </Button>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Metadata" key="metadata">
            <pre>{JSON.stringify(timeseries.metadata, null, 2)}</pre>
          </Tabs.TabPane>
        </Tabs>
        {showEditModal && (
          <AddOrEditTimeseriesModal
            timeseries={timeseries}
            onClose={() => this.setState({ showEditModal: false })}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    asset: origProps.timeseries.assetId
      ? selectAssetById(state, origProps.timeseries.assetId)
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAsset, addTimeseriesToState }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TimeseriesSidebar);
